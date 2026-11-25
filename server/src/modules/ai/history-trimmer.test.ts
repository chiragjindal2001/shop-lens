import { describe, expect, it } from 'vitest';
import type { Message } from '../chat/message.repository';
import { DEFAULT_HISTORY, trimHistory } from './history-trimmer';

const msg = (i: number, content = `message ${i}`): Message => ({
  id: String(i),
  conversationId: 'c',
  userId: 'u',
  role: i % 2 ? 'user' : 'assistant',
  content,
  toolCalls: [],
  sources: [],
  status: 'complete',
  idempotencyKey: null,
  usage: null,
  replyTo: null,
  createdAt: new Date(i),
});
const many = (n: number) => Array.from({ length: n }, (_, i) => msg(i + 1));

describe('trimHistory', () => {
  it('keeps the last maxMessages, oldest dropped first', () => {
    const out = trimHistory(many(20), { maxMessages: 4, maxChars: 100_000 });
    expect(out.map((m) => m.content)).toEqual(['message 17', 'message 18', 'message 19', 'message 20']);
  });

  it('defaults to 10 messages', () => {
    expect(DEFAULT_HISTORY.maxMessages).toBe(10);
    expect(trimHistory(many(30))).toHaveLength(10);
  });

  it('also respects the character budget, always keeping the newest message', () => {
    const long = (i: number) => msg(i, 'x'.repeat(600));
    const out = trimHistory([long(1), long(2), long(3), long(4)], { maxMessages: 10, maxChars: 1500 });
    expect(out).toHaveLength(2); // 2 x 600 fits in 1500, a third does not
    expect(trimHistory([long(1)], { maxMessages: 10, maxChars: 100 })).toHaveLength(1); // never drops the newest
  });

  it('skips empty messages (failed replies)', () => {
    expect(trimHistory([msg(1), msg(2, '   '), msg(3)], { maxMessages: 10, maxChars: 1000 })).toHaveLength(2);
  });
});
