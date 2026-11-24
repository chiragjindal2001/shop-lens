import { describe, expect, it } from 'vitest';
import type { SseEvent } from '@shared';
import { createSseParser } from './sse-parser';

describe('createSseParser', () => {
  it('parses frames split across chunks and ignores comments', () => {
    const got: SseEvent[] = [];
    const p = createSseParser((e) => got.push(e));
    p.feed(': ping\n\nevent: meta\ndata: {"conversationId":"c1","mess');
    p.feed('ageId":"m1"}\n\nevent: token\ndata: {"text":"Hi"}\n\n');
    expect(got).toEqual([
      { event: 'meta', data: { conversationId: 'c1', messageId: 'm1' } },
      { event: 'token', data: { text: 'Hi' } },
    ]);
  });
  it('handles CRLF and skips malformed JSON', () => {
    const got: SseEvent[] = [];
    const p = createSseParser((e) => got.push(e));
    p.feed('event: token\r\ndata: nope\r\n\r\nevent: done\r\ndata: {"messageId":"m"}\r\n\r\n');
    expect(got).toEqual([{ event: 'done', data: { messageId: 'm' } }]);
  });
});
