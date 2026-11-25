import { describe, expect, it, vi } from 'vitest';
import type { Agent } from '../ai/agent';
import type { SseWriter } from './sse';
import { ChatService } from './chat.service';
import type { Message, MessageRepository } from './message.repository';
import type { Conversation, ConversationRepository } from './conversation.repository';

const message = (id: string, role: 'user' | 'assistant', content: string): Message => ({
  id,
  conversationId: 'c1',
  userId: 'u1',
  role,
  content,
  toolCalls: [],
  sources: [],
  status: 'complete',
  idempotencyKey: null,
  usage: null,
  replyTo: null,
  createdAt: new Date(),
});

function setup(listRecent: () => Message[]) {
  const events: string[] = [];
  let releaseCreate!: () => void;

  const messages = {
    findByIdempotencyKey: async () => null,
    insertIfAbsent: async (_u: string, input: { content: string }) => ({ message: message('u1', 'user', input.content), created: true }),
    // The placeholder insert stays pending until the test releases it.
    create: () => {
      events.push('create:started');
      return new Promise<Message>((resolve) => {
        releaseCreate = () => {
          events.push('create:finished');
          resolve(message('a1', 'assistant', ''));
        };
      });
    },
    listRecent: async () => {
      events.push('listRecent:started');
      return listRecent();
    },
    update: async () => undefined,
  } as unknown as MessageRepository;

  const conversations = {
    findById: async () => null,
    create: async (_u: string, title: string): Promise<Conversation> => ({ id: 'c1', userId: 'u1', title, createdAt: new Date(), updatedAt: new Date() }),
    touch: async () => undefined,
  } as unknown as ConversationRepository;

  const run = vi.fn(async ({ onToken }: { onToken(t: string): void }) => {
    onToken('ok');
    return { content: 'ok', toolCalls: [], sources: [], model: 'm', usage: { model: 'm', promptTokens: 1, completionTokens: 1, totalTokens: 2, costUsd: null, llmCalls: 1 } };
  });
  const sse: SseWriter = { send: () => undefined, end: () => undefined };
  const service = new ChatService(conversations, messages, { run } as unknown as Agent);
  const send = () => service.send('u1', { message: 'hi', idempotencyKey: 'key-12345' }, () => sse, new AbortController().signal);

  return { events, send, run, release: () => releaseCreate() };
}

describe('ChatService.send: independent queries run together', () => {
  it('reads the history while the placeholder reply is still being inserted', async () => {
    const t = setup(() => [message('u1', 'user', 'hi')]);
    const done = t.send();

    // Wait until both queries have started. Neither has to finish for the other to start.
    await vi.waitFor(() => expect(t.events).toContain('listRecent:started'));
    expect(t.events).toContain('create:started');
    expect(t.events).not.toContain('create:finished'); // listRecent did not wait for the insert

    t.release();
    await done;
    expect(t.run).toHaveBeenCalledOnce();
  });

  it('never sends the empty placeholder reply to the model, whether or not the read returned it', async () => {
    const withPlaceholder = setup(() => [message('u1', 'user', 'hi'), message('a1', 'assistant', '')]);
    const p1 = withPlaceholder.send();
    await vi.waitFor(() => expect(withPlaceholder.events).toContain('create:started'));
    withPlaceholder.release();
    await p1;
    expect(withPlaceholder.run.mock.calls[0]![0]).toMatchObject({ history: [{ role: 'user', content: 'hi' }] });

    const without = setup(() => [message('u1', 'user', 'hi')]);
    const p2 = without.send();
    await vi.waitFor(() => expect(without.events).toContain('create:started'));
    without.release();
    await p2;
    expect(without.run.mock.calls[0]![0]).toMatchObject({ history: [{ role: 'user', content: 'hi' }] });
  });
});
