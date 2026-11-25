import type { ConversationDto, MessageDto, SendMessageInput } from '@shared';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type { Agent } from '../ai/agent';
import { DEFAULT_HISTORY, trimHistory, type HistoryOptions } from '../ai/history-trimmer';
import type { Conversation, ConversationRepository } from './conversation.repository';
import type { Message, MessageRepository } from './message.repository';
import type { SseWriter } from './sse';

const TITLE_MAX = 60;

export const toConversationDto = (c: Conversation): ConversationDto => ({
  id: c.id,
  title: c.title,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

/** `includeUsage` is true only in development mode; production never exposes token usage or cost. */
export const toMessageDto = (m: Message, includeUsage = false): MessageDto => ({
  id: m.id,
  conversationId: m.conversationId,
  role: m.role,
  content: m.content,
  toolCalls: m.toolCalls,
  sources: m.sources,
  status: m.status,
  ...(m.role === 'user' && m.idempotencyKey ? { idempotencyKey: m.idempotencyKey } : {}),
  ...(includeUsage && m.usage ? { usage: m.usage } : {}),
  createdAt: m.createdAt.toISOString(),
});

export class ChatService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly agent: Agent,
    /** Development mode only: emit, store and return per-reply token usage and cost. */
    private readonly devMode = false,
    /** How much history is sent to the model (HISTORY_MAX_MESSAGES / HISTORY_MAX_CHARS). */
    private readonly history: HistoryOptions = DEFAULT_HISTORY,
  ) {}

  /**
   * Saves the user message, then streams the reply. Anything that can fail with a normal JSON error
   * (unknown conversation, duplicate in-flight request) happens BEFORE `openSse` is called.
   */
  async send(userId: string, input: SendMessageInput, openSse: () => SseWriter, signal: AbortSignal): Promise<void> {
    // 1. Idempotency: a repeated key never creates a second user message or LLM call when already answered.
    const existing = await this.messages.findByIdempotencyKey(userId, input.idempotencyKey);
    let conversation: Conversation;
    let userMessage: Message;

    if (existing) {
      const found = await this.conversations.findById(userId, existing.conversationId);
      if (!found) throw new NotFoundError('Conversation not found');
      conversation = found;
      userMessage = existing;
      const reply = await this.messages.findReplyTo(userId, existing.id);
      if (reply?.status === 'complete') {
        return this.replay(openSse(), conversation.id, reply);
      }
      if (reply) await this.messages.deleteById(userId, reply.id); // retry of a partial/error reply
    } else {
      const found = input.conversationId
        ? await this.conversations.findById(userId, input.conversationId)
        : await this.conversations.create(userId, makeTitle(input.message));
      if (!found) throw new NotFoundError('Conversation not found');
      conversation = found;
      const saved = await this.messages.insertIfAbsent(userId, {
        conversationId: conversation.id,
        role: 'user',
        content: input.message,
        status: 'complete',
        idempotencyKey: input.idempotencyKey,
      });
      if (!saved.created) throw new ConflictError('This message is already being processed', 'IN_PROGRESS');
      userMessage = saved.message;
    }

    // 2. Placeholder assistant message: whatever happens next, something is saved.
    // The placeholder insert and the history read are independent, so they run together (one database
    // round trip less before the first token). The read may or may not include the placeholder: it is
    // filtered out below, and the +2 gives room for it.
    const [assistant, fetched] = await Promise.all([
      this.messages.create(userId, {
        conversationId: conversation.id,
        role: 'assistant',
        content: '',
        status: 'partial',
        replyTo: userMessage.id,
      }),
      this.messages.listRecent(userId, conversation.id, this.history.maxMessages + 2),
    ]);
    const history = trimHistory(
      fetched.filter((m) => m.id !== assistant.id),
      this.history,
    );

    const sse = openSse();
    sse.send({ event: 'meta', data: { conversationId: conversation.id, messageId: assistant.id } });

    let streamed = '';
    try {
      const result = await this.agent.run({
        userId,
        conversationId: conversation.id,
        history,
        signal,
        onToken: (text) => {
          streamed += text;
          sse.send({ event: 'token', data: { text } });
        },
        onTool: (t) => sse.send({ event: 'tool', data: t }),
      });
      await this.messages.update(userId, assistant.id, {
        content: result.content,
        toolCalls: result.toolCalls,
        sources: result.sources,
        status: 'complete',
        ...(this.devMode ? { usage: result.usage } : {}),
      });
      await this.conversations.touch(userId, conversation.id);
      if (result.sources.length) sse.send({ event: 'sources', data: { sources: result.sources } });
      if (this.devMode) sse.send({ event: 'usage', data: result.usage });
      sse.send({ event: 'done', data: { messageId: assistant.id } });
    } catch (err) {
      // Disconnects keep what was generated as `partial`; real failures are `error` when nothing streamed.
      const status = streamed.trim() ? 'partial' : 'error';
      await this.messages.update(userId, assistant.id, { content: streamed, status }).catch(() => undefined);
      await this.conversations.touch(userId, conversation.id).catch(() => undefined);
      if (!signal.aborted) {
        logger.error({ err }, 'chat turn failed');
        sse.send({
          event: 'error',
          data: { message: 'Something went wrong while answering. Please try again.', retryable: true },
        });
      }
    } finally {
      sse.end();
    }
  }

  async listConversations(userId: string, opts: { cursor?: string; limit: number }) {
    const page = await this.conversations.listByUser(userId, opts);
    return { conversations: page.items.map(toConversationDto), nextCursor: page.nextCursor };
  }

  async getConversation(userId: string, id: string) {
    const conversation = await this.conversations.findById(userId, id);
    if (!conversation) throw new NotFoundError('Conversation not found');
    const messages = await this.messages.listByConversation(userId, id);
    return { conversation: toConversationDto(conversation), messages: messages.map((m) => toMessageDto(m, this.devMode)) };
  }

  async deleteConversation(userId: string, id: string): Promise<void> {
    const ok = await this.conversations.delete(userId, id);
    if (!ok) throw new NotFoundError('Conversation not found');
  }

  private replay(sse: SseWriter, conversationId: string, reply: Message): void {
    sse.send({ event: 'meta', data: { conversationId, messageId: reply.id } });
    sse.send({ event: 'token', data: { text: reply.content } });
    if (reply.sources.length) sse.send({ event: 'sources', data: { sources: reply.sources } });
    if (this.devMode && reply.usage) sse.send({ event: 'usage', data: reply.usage });
    sse.send({ event: 'done', data: { messageId: reply.id } });
    sse.end();
  }
}

export function makeTitle(message: string): string {
  const oneLine = message.replace(/\s+/g, ' ').trim();
  return oneLine.length > TITLE_MAX ? `${oneLine.slice(0, TITLE_MAX - 1).trimEnd()}…` : oneLine;
}
