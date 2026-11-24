import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../config/env';
import { OpenRouterClient } from './openrouter-client';

const sse = (...chunks: object[]) =>
  new Response([...chunks.map((c) => 'data: ' + JSON.stringify(c) + '\n\n'), 'data: [DONE]\n\n'].join(''), {
    headers: { 'Content-Type': 'text/event-stream' },
  });

describe('OpenRouterClient request body', () => {
  const req = { messages: [{ role: 'user' as const, content: 'hi' }] };

  it('sends max_tokens and asks for usage/cost, and returns the reported cost', async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(init.body as string);
      return sse(
        { model: 'openai/gpt-4o-mini', choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 2, cost: 0.0000027 } },
      );
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient({ apiKey: 'k', models: ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001'], maxTokens: 500, fetchImpl });
    const res = await client.chat(req);

    expect(body.max_tokens).toBe(500);
    expect(body.models).toEqual(['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001']);
    expect(body.usage).toEqual({ include: true });
    expect(res.content).toBe('Hello');
    expect(res.usage).toEqual({ promptTokens: 10, completionTokens: 2, costUsd: 0.0000027 });
  });

  it('omits max_tokens when no limit is configured', async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(init.body as string);
      return sse({ choices: [{ delta: { content: 'x' } }] });
    }) as unknown as typeof fetch;
    await new OpenRouterClient({ apiKey: 'k', models: ['m'], fetchImpl }).chat(req);
    expect('max_tokens' in body).toBe(false);
  });
});

describe('LLM_MAX_TOKENS config', () => {
  const base = {
    MONGO_HOST: 'h', MONGO_DB_NAME: 'd', JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32), LLM_PROVIDER: 'mock',
  };
  it('defaults to 500 and can be overridden', () => {
    expect(loadConfig(base).LLM_MAX_TOKENS).toBe(500);
    expect(loadConfig({ ...base, LLM_MAX_TOKENS: '300' }).LLM_MAX_TOKENS).toBe(300);
    expect(loadConfig({ ...base, LLM_MAX_TOKENS: '' }).LLM_MAX_TOKENS).toBe(500);
  });
});
