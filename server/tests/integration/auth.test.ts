import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserModel } from '../../src/infra/mongo/user.mongo';
import { startTestEnv, type TestEnv } from '../helpers/test-container';
import { auth, signup, uniqueEmail } from '../helpers/factories';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

describe('signup', () => {
  it('hashes the password with bcrypt and returns a token + refresh cookie', async () => {
    const email = uniqueEmail();
    const res = await request(env.app).post('/api/auth/signup').send({ name: 'A', email, password: 'Passw0rd!x' }).expect(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toMatch(/refresh_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    const stored = await UserModel.findOne({ email }).lean();
    expect(stored!.passwordHash).not.toContain('Passw0rd');
    expect(await bcrypt.compare('Passw0rd!x', stored!.passwordHash)).toBe(true);
  });

  it('rejects duplicate emails with 409 (case-insensitive)', async () => {
    const email = uniqueEmail();
    await signup(env.app, { email });
    await request(env.app).post('/api/auth/signup').send({ name: 'B', email: email.toUpperCase(), password: 'Passw0rd!x' }).expect(409);
  });

  it.each([['short1'], ['allletterspassword'], ['12345678901']])('rejects weak password %s', async (password) => {
    const res = await request(env.app).post('/api/auth/signup').send({ name: 'W', email: uniqueEmail(), password }).expect(400);
    expect(res.body.error.fields.password).toBeTruthy();
  });

  it('seeds demo orders for the new user', async () => {
    const u = await signup(env.app);
    expect(await env.repos.orders.listByUser(u.id, 10)).toHaveLength(4);
  });
});

describe('login', () => {
  it('returns the same error for unknown email and wrong password', async () => {
    const u = await signup(env.app);
    const wrong = await request(env.app).post('/api/auth/login').send({ email: u.email, password: 'Wrong1234' }).expect(401);
    const unknown = await request(env.app).post('/api/auth/login').send({ email: uniqueEmail(), password: 'Wrong1234' }).expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.message).toBe('Invalid email or password');
  });

  it('logs in with correct credentials', async () => {
    const u = await signup(env.app);
    const res = await request(env.app).post('/api/auth/login').send({ email: u.email, password: u.password }).expect(200);
    expect(res.body.user.id).toBe(u.id);
  });
});

describe('protected routes, refresh and logout', () => {
  it('returns 401 without a token and 200 with one', async () => {
    await request(env.app).get('/api/auth/me').expect(401);
    await request(env.app).get('/api/chat/history').expect(401);
    await request(env.app).get('/api/chat/history').set('Authorization', 'Bearer garbage').expect(401);
    const u = await signup(env.app);
    const me = await request(env.app).get('/api/auth/me').set(auth(u)).expect(200);
    expect(me.body.user.email).toBe(u.email);
  });

  it('refresh rotates the token; replaying the old one fails and revokes the session', async () => {
    const u = await signup(env.app);
    const r1 = await request(env.app).post('/api/auth/refresh').set('Cookie', u.cookie).expect(200);
    expect(r1.body.accessToken).toBeTruthy();
    const newCookie = (r1.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    expect(newCookie).not.toBe(u.cookie);

    await request(env.app).post('/api/auth/refresh').set('Cookie', u.cookie).expect(401); // old token replayed
    await request(env.app).post('/api/auth/refresh').set('Cookie', newCookie).expect(401); // session now revoked
  });

  it('logout revokes the session and clears the cookie', async () => {
    const u = await signup(env.app);
    const res = await request(env.app).post('/api/auth/logout').set('Cookie', u.cookie).expect(204);
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/refresh_token=;/);
    await request(env.app).post('/api/auth/refresh').set('Cookie', u.cookie).expect(401);
  });

  it('refresh without a cookie is 401', async () => {
    await request(env.app).post('/api/auth/refresh').expect(401);
  });
});

describe('auth rate limiting', () => {
  it('returns 429 after 10 login/signup attempts per IP in the window', async () => {
    const { createApp } = await import('../../src/app');
    const { buildContainer } = await import('../../src/container');
    const config = { ...env.container.config, rateLimits: { ...env.container.config.rateLimits, auth: { windowMs: 60_000, limit: 3 } } };
    const app = createApp(buildContainer(config, { repos: env.repos }));
    for (let i = 0; i < 3; i++) await request(app).post('/api/auth/login').send({ email: 'x@y.co', password: 'Nope1234' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'x@y.co', password: 'Nope1234' }).expect(429);
  });
});

describe('platform', () => {
  it('serves /api/health and a JSON 404 for unknown API routes', async () => {
    const h = await request(env.app).get('/api/health').expect(200);
    expect(h.body).toEqual({ status: 'ok', db: true });
    expect(h.headers['x-request-id']).toBeTruthy();
    await request(env.app).get('/api/nope').expect(404);
  });

  it('rejects oversized bodies', async () => {
    await request(env.app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(20_000) }).expect(413);
  });
});
