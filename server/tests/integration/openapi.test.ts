import { readFileSync } from 'node:fs';
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { buildContainer } from '../../src/container';
import { buildOpenApiSpec } from '../../src/openapi/spec';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

const spec = buildOpenApiSpec() as {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }> };
};
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const operations = Object.entries(spec.paths).flatMap(([p, item]) =>
  Object.keys(item)
    .filter((m) => HTTP_METHODS.includes(m))
    .map((m) => ({ method: m.toUpperCase(), path: p })),
);

describe('OpenAPI document', () => {
  it('is a valid OpenAPI 3.1 document with every $ref resolvable', async () => {
    await expect(SwaggerParser.validate(structuredClone(spec) as never)).resolves.toBeTruthy();
  });

  it('request schemas come from the shared Zod schemas (same rules as the routes)', () => {
    const { SignupRequest, LoginRequest, SendMessageRequest } = spec.components.schemas;
    expect(SignupRequest!.required).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    expect(JSON.stringify(SignupRequest)).toContain('"maxLength":72'); // password rule
    expect(LoginRequest!.required).toEqual(expect.arrayContaining(['email', 'password']));
    expect(SendMessageRequest!.required).toEqual(expect.arrayContaining(['message', 'idempotencyKey']));
    expect(JSON.stringify(SendMessageRequest)).toContain('"maxLength":2000'); // MAX_MESSAGE_LENGTH
  });

  it('documents only routes that really exist (none answers "Route not found")', async () => {
    for (const { method, path: p } of operations) {
      const url = '/api' + p.replace('{conversationId}', 'x');
      const res = await request(env.app)[method.toLowerCase() as 'get'](url);
      expect(res.body?.error?.message, `${method} ${p}`).not.toBe('Route not found');
    }
  });
});

describe('Swagger UI endpoints', () => {
  it('serves the spec as JSON and the UI as HTML', async () => {
    const json = await request(env.app).get('/api/openapi.json').expect(200);
    expect(json.body.openapi).toBe('3.1.0');
    expect(Object.keys(json.body.paths)).toContain('/chat/send');

    const ui = await request(env.app).get('/api/docs/').expect(200);
    expect(ui.headers['content-type']).toMatch(/text\/html/);
    expect(ui.text).toContain('swagger-ui');
  });

  it('relaxes the CSP only for the docs page (inline styles), never for scripts or the API', async () => {
    const ui = await request(env.app).get('/api/docs/');
    const csp = String(ui.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");

    const api = await request(env.app).get('/api/health');
    expect(String(api.headers['content-security-policy'])).not.toContain("style-src 'self' 'unsafe-inline'");
  });

  it('is off in production by default, and can be switched on with API_DOCS=true', async () => {
    const base = {
      MONGO_HOST: 'x', MONGO_DB_NAME: 'x', JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32), LLM_PROVIDER: 'mock',
    };
    expect(loadConfig({ ...base, NODE_ENV: 'production' }).docsEnabled).toBe(false);
    expect(loadConfig({ ...base, NODE_ENV: 'production', API_DOCS: 'true' }).docsEnabled).toBe(true);
    expect(loadConfig({ ...base, NODE_ENV: 'development' }).docsEnabled).toBe(true);
    expect(loadConfig({ ...base, NODE_ENV: 'development', API_DOCS: 'false' }).docsEnabled).toBe(false);

    const prodApp = createApp(buildContainer({ ...env.container.config, NODE_ENV: 'production', docsEnabled: false }, { repos: env.repos }));
    await request(prodApp).get('/api/docs/').expect(404);
    await request(prodApp).get('/api/openapi.json').expect(404);
  });
});

describe('Postman collection', () => {
  const dir = path.resolve(__dirname, '../../../docs/postman');
  const collection = JSON.parse(readFileSync(path.join(dir, 'shoplens.postman_collection.json'), 'utf8'));

  type Item = { name: string; item?: Item[]; request?: { method: string; url: { path: string[] } } };
  const flatten = (items: Item[]): Item[] => items.flatMap((i) => (i.item ? flatten(i.item) : [i]));
  const requests = flatten(collection.item as Item[]);

  it('has a request for every documented operation, and nothing undocumented', () => {
    const inCollection = new Set(
      requests.map((r) => `${r.request!.method} /${r.request!.url.path.map((s) => (s === ':conversationId' ? '{conversationId}' : s)).join('/')}`),
    );
    const inSpec = new Set(operations.map((o) => `${o.method} ${o.path}`));
    expect([...inCollection].sort()).toEqual([...inSpec].sort());
  });

  it('is a v2.1 collection that chains requests through variables', () => {
    expect(collection.info.schema).toContain('v2.1.0');
    expect(collection.auth.bearer[0].value).toBe('{{accessToken}}');
    const names = collection.variable.map((v: { key: string }) => v.key);
    expect(names).toEqual(expect.arrayContaining(['baseUrl', 'accessToken', 'conversationId']));
  });

  it('the environment holds only baseUrl, so it cannot shadow variables the scripts set', () => {
    const envFile = JSON.parse(readFileSync(path.join(dir, 'shoplens.postman_environment.json'), 'utf8'));
    expect(envFile.values.map((v: { key: string }) => v.key)).toEqual(['baseUrl']);
  });
});
