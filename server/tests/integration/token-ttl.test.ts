import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { buildContainer } from '../../src/container';
import { uniqueEmail } from '../helpers/factories';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

const baseEnv = {
  MONGO_HOST: 'x',
  MONGO_DB_NAME: 'x',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  LLM_PROVIDER: 'mock',
};

describe('ACCESS_TOKEN_TTL / REFRESH_TOKEN_TTL config', () => {
  it('defaults to 15 minutes and 7 days', () => {
    const c = loadConfig(baseEnv);
    expect(c.accessTokenTtlSeconds).toBe(15 * 60);
    expect(c.refreshTokenTtlSeconds).toBe(7 * 24 * 3600);
  });

  it('accepts friendly durations, and treats blank values as unset', () => {
    const c = loadConfig({ ...baseEnv, ACCESS_TOKEN_TTL: '1h', REFRESH_TOKEN_TTL: '30d' });
    expect([c.accessTokenTtlSeconds, c.refreshTokenTtlSeconds]).toEqual([3600, 30 * 86_400]);
    expect(loadConfig({ ...baseEnv, ACCESS_TOKEN_TTL: '', REFRESH_TOKEN_TTL: '' }).accessTokenTtlSeconds).toBe(900);
  });

  it.each([
    [{ ACCESS_TOKEN_TTL: 'soon' }, /ACCESS_TOKEN_TTL must look like/],
    [{ ACCESS_TOKEN_TTL: '30s' }, /ACCESS_TOKEN_TTL must be between 1m and 1d/],
    [{ ACCESS_TOKEN_TTL: '2d' }, /ACCESS_TOKEN_TTL must be between 1m and 1d/],
    [{ REFRESH_TOKEN_TTL: '7 days' }, /REFRESH_TOKEN_TTL must look like/],
    [{ REFRESH_TOKEN_TTL: '120d' }, /REFRESH_TOKEN_TTL must be at most 90d/],
    [{ ACCESS_TOKEN_TTL: '1d', REFRESH_TOKEN_TTL: '2h' }, /must not be shorter than ACCESS_TOKEN_TTL/],
  ])('fails fast on %j', (over, message) => {
    expect(() => loadConfig({ ...baseEnv, ...over })).toThrow(message);
  });
});

describe('configured lifetimes reach the JWT, the cookie and the stored session', () => {
  it('uses the configured values end to end', async () => {
    const cfg = loadConfig({
      ...baseEnv,
      NODE_ENV: 'test',
      BCRYPT_COST: '4',
      JWT_ACCESS_SECRET: env.container.config.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: env.container.config.JWT_REFRESH_SECRET,
      ACCESS_TOKEN_TTL: '5m',
      REFRESH_TOKEN_TTL: '2h',
    });
    const app = createApp(buildContainer({ ...cfg, rateLimits: env.container.config.rateLimits }, { repos: env.repos }));

    const res = await request(app).post('/api/auth/signup').send({ name: 'T', email: uniqueEmail(), password: 'Passw0rd!x' }).expect(201);

    // Access token: exp - iat = 5 minutes
    const access = jwt.decode(res.body.accessToken) as { exp: number; iat: number };
    expect(access.exp - access.iat).toBe(5 * 60);

    // Refresh cookie: Max-Age = 2 hours, and the refresh JWT agrees
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toMatch(/Max-Age=7200\b/);
    const refresh = jwt.decode(cookie.split(';')[0]!.split('=')[1]!) as { exp: number; iat: number; sid: string };
    expect(refresh.exp - refresh.iat).toBe(2 * 3600);

    // Stored session expires in ~2 hours (this is what the Mongo TTL index uses)
    const session = await env.repos.sessions.findById(refresh.sid);
    const msLeft = session!.expiresAt.getTime() - Date.now();
    expect(msLeft).toBeGreaterThan(2 * 3600_000 - 10_000);
    expect(msLeft).toBeLessThanOrEqual(2 * 3600_000);

    // Rotation keeps the sliding window at the configured length
    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', cookie.split(';')[0]!).expect(200);
    expect((refreshed.headers['set-cookie'] as unknown as string[])[0]).toMatch(/Max-Age=7200\b/);
  });
});
