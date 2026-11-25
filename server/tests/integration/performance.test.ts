import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, sendChat, signup, tokensText } from '../helpers/factories';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
let dist: string;

beforeAll(async () => {
  // A fake built client: an index page and a large script, like the real 324 kB bundle.
  dist = mkdtempSync(path.join(tmpdir(), 'shoplens-dist-'));
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><body><div id="root"></div></body></html>');
  writeFileSync(path.join(dist, 'assets', 'app.js'), 'function renderShoplens(){return "hello world";}\n'.repeat(5000));
  env = await startTestEnv({ config: { CLIENT_DIST: dist } });
});
afterAll(async () => {
  await env.stop();
  rmSync(dist, { recursive: true, force: true });
});

describe('response compression', () => {
  it('gzips large static files (the client bundle)', async () => {
    const res = await request(env.app).get('/assets/app.js').set('Accept-Encoding', 'gzip').expect(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.headers.vary).toMatch(/Accept-Encoding/i);
    expect(res.headers['cache-control']).toContain('immutable'); // hashed assets are still cached long-term
  });

  it('gzips JSON over 1 kB, but leaves tiny responses alone', async () => {
    const u = await signup(env.app);
    const products = await request(env.app).get('/api/products').set(auth(u)).set('Accept-Encoding', 'gzip').expect(200);
    expect(products.headers['content-encoding']).toBe('gzip');

    const health = await request(env.app).get('/api/health').set('Accept-Encoding', 'gzip').expect(200);
    expect(health.headers['content-encoding']).toBeUndefined();
  });

  it('never compresses the chat stream: tokens must still arrive one by one', async () => {
    const u = await signup(env.app);
    const res = await request(env.app)
      .post('/api/chat/send')
      .set(auth(u))
      .set('Accept-Encoding', 'gzip')
      .send({ message: 'What is your return policy?', idempotencyKey: crypto.randomUUID() })
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: done');
    // and the usual path still works end to end
    const { events } = await sendChat(env.app, u, 'Where is my order SE1041?');
    expect(tokensText(events)).toMatch(/SE1041 is shipped/);
  });
});

describe('caching', () => {
  it('the catalog may be reused by the browser for a few minutes (it is static, and private to the logged-in user)', async () => {
    const u = await signup(env.app);
    const res = await request(env.app).get('/api/products').set(auth(u)).expect(200);
    expect(res.headers['cache-control']).toBe('private, max-age=300');
  });

  it('orders are never cached (they change when the assistant cancels or returns one)', async () => {
    const u = await signup(env.app);
    const res = await request(env.app).get('/api/orders').set(auth(u)).expect(200);
    expect(res.headers['cache-control']).toBeUndefined();
  });
});
