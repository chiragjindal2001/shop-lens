import { describe, expect, it, vi } from 'vitest';
import { LlmError } from '../../lib/errors';
import type { LlmClient } from './llm-client';
import { ResilientLlm } from './resilient-llm';

const opts = { timeoutMs: 50, retries: 2, baseDelayMs: 1, sleep: async () => {} };
const ok = { content: 'hi', toolCalls: [], model: 'm' };
const req = { messages: [{ role: 'user' as const, content: 'x' }] };

describe('ResilientLlm embeddings', () => {
  it('retries embed on 5xx and returns the vectors', async () => {
    const embed = vi.fn().mockRejectedValueOnce(new LlmError('down', 503)).mockResolvedValue([[1, 2]]);
    expect(await new ResilientLlm({ embed } as unknown as LlmClient, opts).embed(['x'])).toEqual([[1, 2]]);
    expect(embed).toHaveBeenCalledTimes(2);
  });
  it('does not retry a 400 on embed', async () => {
    const embed = vi.fn().mockRejectedValue(new LlmError('bad model', 400));
    await expect(new ResilientLlm({ embed } as unknown as LlmClient, opts).embed(['x'])).rejects.toThrow('bad model');
    expect(embed).toHaveBeenCalledTimes(1);
  });
});

describe('ResilientLlm', () => {
  it('retries 429/5xx and then succeeds', async () => {
    const chat = vi.fn().mockRejectedValueOnce(new LlmError('rate', 429)).mockRejectedValueOnce(new LlmError('down', 503)).mockResolvedValue(ok);
    expect(await new ResilientLlm({ chat } as unknown as LlmClient, opts).chat(req)).toEqual(ok);
    expect(chat).toHaveBeenCalledTimes(3);
  });
  it('never retries 4xx validation errors', async () => {
    const chat = vi.fn().mockRejectedValue(new LlmError('bad request', 400));
    await expect(new ResilientLlm({ chat } as unknown as LlmClient, opts).chat(req)).rejects.toThrow('bad request');
    expect(chat).toHaveBeenCalledTimes(1);
  });
  it('gives up after the retry budget', async () => {
    const chat = vi.fn().mockRejectedValue(new LlmError('down', 500));
    await expect(new ResilientLlm({ chat } as unknown as LlmClient, opts).chat(req)).rejects.toThrow('down');
    expect(chat).toHaveBeenCalledTimes(3);
  });
  it('does not retry once tokens have streamed (would duplicate output)', async () => {
    const chat = vi.fn().mockImplementation(async (r) => (r.onToken('partial'), Promise.reject(new LlmError('cut', 502))));
    await expect(new ResilientLlm({ chat } as unknown as LlmClient, opts).chat(req)).rejects.toThrow('cut');
    expect(chat).toHaveBeenCalledTimes(1);
  });
  it('times out a hung request and retries', async () => {
    let n = 0;
    const chat = vi.fn().mockImplementation((r) =>
      ++n === 1 ? new Promise((_, rej) => r.signal.addEventListener('abort', () => rej(new Error('aborted')))) : Promise.resolve(ok),
    );
    expect(await new ResilientLlm({ chat } as unknown as LlmClient, opts).chat(req)).toEqual(ok);
    expect(chat).toHaveBeenCalledTimes(2);
  });
  it('does not retry when the caller aborts', async () => {
    const ac = new AbortController();
    const chat = vi.fn().mockImplementation(async () => (ac.abort(), Promise.reject(new Error('aborted'))));
    await expect(new ResilientLlm({ chat } as unknown as LlmClient, opts).chat({ ...req, signal: ac.signal })).rejects.toThrow();
    expect(chat).toHaveBeenCalledTimes(1);
  });
});
