import { describe, expect, it } from 'vitest';
import { loadConfig } from './env';

const base = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  LLM_PROVIDER: 'mock',
};

describe('mongo connection config', () => {
  it('builds a plain local URI', () => {
    const c = loadConfig({ ...base, MONGO_HOST: 'localhost', MONGO_DB_NAME: 'shoplens', MONGO_OPTIONS: 'directConnection=true' });
    expect(c.mongoUri).toBe('mongodb://localhost:27017/shoplens?directConnection=true');
  });
  it('adds URL-encoded credentials and authSource', () => {
    const c = loadConfig({ ...base, MONGO_HOST: 'db', MONGO_PORT: '27018', MONGO_DB_NAME: 'app', MONGO_USER: 'me@x', MONGO_PASSWORD: 'p@ss:/w?rd' });
    expect(c.mongoUri).toBe('mongodb://me%40x:p%40ss%3A%2Fw%3Frd@db:27018/app?authSource=admin');
  });
  it('builds an Atlas SRV URI without a port', () => {
    const c = loadConfig({ ...base, MONGO_SRV: 'true', MONGO_HOST: 'c0.abc.mongodb.net', MONGO_DB_NAME: 'shoplens', MONGO_USER: 'u', MONGO_PASSWORD: 'p', MONGO_OPTIONS: '?retryWrites=true&w=majority' });
    expect(c.mongoUri).toBe('mongodb+srv://u:p@c0.abc.mongodb.net/shoplens?retryWrites=true&w=majority&authSource=admin');
  });
  it('treats empty values as unset so defaults apply (e.g. a blank MONGO_PORT with Atlas)', () => {
    const c = loadConfig({
      ...base, MONGO_SRV: 'true', MONGO_HOST: 'c0.abc.mongodb.net', MONGO_PORT: '', MONGO_DB_NAME: 'shoplens',
      MONGO_USER: 'u', MONGO_PASSWORD: 'p', MONGO_OPTIONS: '', TRUST_PROXY: '', COOKIE_SECURE: '',
    });
    expect(c.mongoUri).toBe('mongodb+srv://u:p@c0.abc.mongodb.net/shoplens?authSource=admin');
    expect(c.TRUST_PROXY).toBe(0);
    expect(c.COOKIE_SECURE).toBeUndefined();
  });
  it('fails fast when host or database name is missing', () => {
    expect(() => loadConfig({ ...base })).toThrow(/MONGO_HOST[\s\S]*MONGO_DB_NAME|MONGO_DB_NAME[\s\S]*MONGO_HOST/);
  });
});
