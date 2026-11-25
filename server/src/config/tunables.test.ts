import { describe, expect, it } from 'vitest';
import { loadConfig } from './env';

const base = {
  MONGO_HOST: 'x',
  MONGO_DB_NAME: 'x',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  LLM_PROVIDER: 'mock',
};

describe('tunable limits: defaults', () => {
  it('match the values that used to be hardcoded', () => {
    const c = loadConfig(base);
    expect(c.rateLimits).toEqual({
      auth: { windowMs: 15 * 60_000, limit: 10 },
      chat: { windowMs: 60_000, limit: 20 },
    });
    expect(c.HISTORY_MAX_MESSAGES).toBe(10);
    expect(c.HISTORY_MAX_CHARS).toBe(12_000);
    expect(c.MAX_TOOL_ROUNDS).toBe(4);
    expect(c.llmTimeoutMs).toBe(30_000);
    expect(c.LLM_MAX_RETRIES).toBe(2);
  });
});

describe('tunable limits: overrides', () => {
  it('are read from the environment', () => {
    const c = loadConfig({
      ...base,
      RATE_LIMIT_AUTH_MAX: '5',
      RATE_LIMIT_AUTH_WINDOW: '1h',
      RATE_LIMIT_CHAT_MAX: '60',
      RATE_LIMIT_CHAT_WINDOW: '30s',
      HISTORY_MAX_MESSAGES: '6',
      HISTORY_MAX_CHARS: '4000',
      MAX_TOOL_ROUNDS: '2',
      LLM_TIMEOUT: '2m',
      LLM_MAX_RETRIES: '0',
    });
    expect(c.rateLimits).toEqual({
      auth: { windowMs: 3_600_000, limit: 5 },
      chat: { windowMs: 30_000, limit: 60 },
    });
    expect([c.HISTORY_MAX_MESSAGES, c.HISTORY_MAX_CHARS, c.MAX_TOOL_ROUNDS]).toEqual([6, 4000, 2]);
    expect([c.llmTimeoutMs, c.LLM_MAX_RETRIES]).toEqual([120_000, 0]);
  });

  it('treats blank values as unset', () => {
    const c = loadConfig({ ...base, RATE_LIMIT_CHAT_WINDOW: '', LLM_TIMEOUT: '', MAX_TOOL_ROUNDS: '' });
    expect([c.rateLimits.chat.windowMs, c.llmTimeoutMs, c.MAX_TOOL_ROUNDS]).toEqual([60_000, 30_000, 4]);
  });
});

describe('tunable limits: validation fails fast', () => {
  it.each([
    [{ RATE_LIMIT_CHAT_MAX: '0' }, /RATE_LIMIT_CHAT_MAX/],
    [{ RATE_LIMIT_AUTH_WINDOW: 'often' }, /RATE_LIMIT_AUTH_WINDOW must look like/],
    [{ RATE_LIMIT_CHAT_WINDOW: '2d' }, /RATE_LIMIT_CHAT_WINDOW must look like/],
    [{ HISTORY_MAX_MESSAGES: '0' }, /HISTORY_MAX_MESSAGES/],
    [{ HISTORY_MAX_CHARS: '100' }, /HISTORY_MAX_CHARS/],
    [{ MAX_TOOL_ROUNDS: '11' }, /MAX_TOOL_ROUNDS/],
    [{ LLM_TIMEOUT: '1s' }, /LLM_TIMEOUT must look like/],
    [{ LLM_TIMEOUT: 'slow' }, /LLM_TIMEOUT must look like/],
    [{ LLM_MAX_RETRIES: '9' }, /LLM_MAX_RETRIES/],
  ])('%j', (over, message) => {
    expect(() => loadConfig({ ...base, ...over })).toThrow(message);
  });
});
