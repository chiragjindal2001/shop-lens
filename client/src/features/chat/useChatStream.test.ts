import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SseEvent } from '@shared';

const streamMessage = vi.fn();
const fetchConversation = vi.fn();
vi.mock('./api', () => ({
  streamMessage: (...args: unknown[]) => streamMessage(...args),
  fetchConversation: (...args: unknown[]) => fetchConversation(...args),
}));
import { useChatStream } from './useChatStream';

const options = () => ({ onConversationCreated: vi.fn(), onTurnFinished: vi.fn(), onNotFound: vi.fn() });

/** Makes the mocked stream emit the given events, one after another. */
const emits = (events: SseEvent[]) =>
  streamMessage.mockImplementation(async ({ onEvent }: { onEvent: (e: SseEvent) => void }) => {
    for (const e of events) onEvent(e);
  });

beforeEach(() => {
  streamMessage.mockReset();
  fetchConversation.mockReset();
});

describe('useChatStream', () => {
  it('assembles streamed tokens in order, in a single message', async () => {
    emits([
      { event: 'meta', data: { conversationId: 'c1', messageId: 'm1' } },
      { event: 'tool', data: { name: 'search_policies', label: 'Searching our policies…' } },
      { event: 'token', data: { text: 'Hel' } },
      { event: 'token', data: { text: 'lo ' } },
      { event: 'token', data: { text: 'there' } },
      { event: 'sources', data: { sources: [{ source: 'Returns Policy' }] } },
      { event: 'done', data: { messageId: 'm1' } },
    ]);
    const opts = options();
    const { result } = renderHook(() => useChatStream(opts));

    await act(() => result.current.send('hi'));

    expect(result.current.messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'hi'],
      ['assistant', 'Hello there'],
    ]);
    const reply = result.current.messages[1]!;
    expect(reply).toMatchObject({ id: 'm1', status: 'complete', streaming: false, sources: [{ source: 'Returns Policy' }] });
    expect(reply.toolLabel).toBeUndefined();
    expect(opts.onConversationCreated).toHaveBeenCalledWith('c1');
    expect(opts.onTurnFinished).toHaveBeenCalledExactlyOnceWith({ toolsUsed: ['search_policies'] }); // so the page reloads only what could change
    expect(result.current.streaming).toBe(false);
  });

  it('applies a burst of tokens in far fewer renders than tokens (one update per frame)', async () => {
    const tokens = Array.from({ length: 200 }, (_, i) => ({ event: 'token' as const, data: { text: `t${i} ` } }));
    emits([{ event: 'meta', data: { conversationId: 'c1', messageId: 'm1' } }, ...tokens, { event: 'done', data: { messageId: 'm1' } }]);
    let renders = 0;
    const opts = options();
    const { result } = renderHook(() => {
      renders++;
      return useChatStream(opts);
    });
    await act(() => result.current.send('go'));
    expect(result.current.messages[1]!.content).toBe(tokens.map((t) => t.data.text).join(''));
    expect(renders).toBeLessThan(30); // 200 tokens, but a handful of renders
  });

  it('keeps what was streamed when the stream fails midway', async () => {
    streamMessage.mockImplementation(async ({ onEvent }: { onEvent: (e: SseEvent) => void }) => {
      onEvent({ event: 'token', data: { text: 'Partial ' } });
      onEvent({ event: 'error', data: { message: 'boom', retryable: true } });
    });
    const { result } = renderHook(() => useChatStream(options()));
    await act(() => result.current.send('hi'));
    expect(result.current.messages[1]).toMatchObject({ content: 'Partial ', status: 'partial', streaming: false });
  });

  it('a failure before the stream opens leaves a Retry that reuses the same idempotency key', async () => {
    streamMessage.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useChatStream(options()));
    await act(() => result.current.send('hello'));

    expect(result.current.sendError).toMatchObject({ text: 'hello' });
    const key = result.current.sendError!.key;
    expect(result.current.messages.map((m) => m.role)).toEqual(['user']); // empty placeholder dropped

    emits([{ event: 'meta', data: { conversationId: 'c1', messageId: 'm1' } }, { event: 'token', data: { text: 'ok' } }, { event: 'done', data: { messageId: 'm1' } }]);
    await act(async () => result.current.retrySendError());
    await waitFor(() => expect(result.current.messages.at(-1)?.content).toBe('ok'));
    expect(streamMessage.mock.calls.at(-1)![0]).toMatchObject({ idempotencyKey: key, message: 'hello' });
    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(1); // not duplicated
  });

  it('ignores a second send while a reply is still streaming', async () => {
    let release!: () => void;
    streamMessage.mockImplementation(() => new Promise<void>((r) => (release = r)));
    const { result } = renderHook(() => useChatStream(options()));
    let first!: Promise<void>;
    act(() => void (first = result.current.send('one')));
    await act(async () => void result.current.send('two'));
    expect(streamMessage).toHaveBeenCalledOnce();
    await act(async () => {
      release();
      await first;
    });
  });

  it('opens an existing conversation, and treats the same id as a no-op', async () => {
    fetchConversation.mockResolvedValue({ conversation: { id: 'c9' }, messages: [{ id: 'a', role: 'user', content: 'old', sources: [], toolCalls: [], status: 'complete' }] });
    const { result } = renderHook(() => useChatStream(options()));
    await act(() => result.current.open('c9'));
    expect(result.current.messages).toHaveLength(1);
    await act(() => result.current.open('c9'));
    expect(fetchConversation).toHaveBeenCalledOnce();
    await act(() => result.current.open(undefined)); // "new chat"
    expect(result.current.messages).toEqual([]);
  });

  it('reports an unknown conversation id', async () => {
    const { ApiError } = await import('../../lib/http');
    fetchConversation.mockRejectedValue(new ApiError('nope', 404));
    const opts = options();
    const { result } = renderHook(() => useChatStream(opts));
    await act(() => result.current.open('missing'));
    expect(opts.onNotFound).toHaveBeenCalledOnce();
  });
});

describe('reset (start a new chat)', () => {
  const done = (id: string): SseEvent[] => [
    { event: 'meta', data: { conversationId: id, messageId: 'm-' + id } },
    { event: 'token', data: { text: 'ok' } },
    { event: 'done', data: { messageId: 'm-' + id } },
  ];

  it('forgets the conversation: the old messages are cleared and the next message starts a new one', async () => {
    emits(done('c1'));
    const { result } = renderHook(() => useChatStream(options()));

    await act(() => result.current.send('first'));
    await act(() => result.current.send('second')); // normally the chat continues
    expect(streamMessage.mock.calls[1]![0]).toMatchObject({ conversationId: 'c1' });

    act(() => result.current.reset());
    expect(result.current.messages).toEqual([]);

    await act(() => result.current.send('third'));
    expect(streamMessage.mock.calls[2]![0]).toMatchObject({ conversationId: undefined }); // a new conversation
    expect(result.current.messages.map((m) => m.content)).toEqual(['third', 'ok']); // none of the earlier messages
  });

  it('does nothing while a reply is still streaming', async () => {
    let release!: () => void;
    streamMessage.mockImplementation(({ onEvent }: { onEvent: (e: SseEvent) => void }) => {
      onEvent({ event: 'meta', data: { conversationId: 'c1', messageId: 'm1' } });
      return new Promise<void>((resolve) => (release = resolve));
    });
    const { result } = renderHook(() => useChatStream(options()));
    let sending!: Promise<void>;
    act(() => void (sending = result.current.send('hello')));
    expect(result.current.messages).toHaveLength(2);

    act(() => result.current.reset());
    expect(result.current.messages).toHaveLength(2); // the streaming chat is left alone

    await act(async () => {
      release();
      await sending;
    });
  });
});
