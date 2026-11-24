import type { MessageRole, MessageStatus, SourceRef, ToolCallRecord, UsageDto } from '@shared';

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  toolCalls: ToolCallRecord[];
  sources: SourceRef[];
  status: MessageStatus;
  idempotencyKey: string | null;
  /** Token usage and cost. Only stored when the server runs in development mode. */
  usage: UsageDto | null;
  /** For assistant messages: the user message this reply answers. */
  replyTo: string | null;
  createdAt: Date;
}

export interface NewMessage {
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  idempotencyKey?: string;
  replyTo?: string;
}

export interface MessagePatch {
  content?: string;
  status?: MessageStatus;
  toolCalls?: ToolCallRecord[];
  sources?: SourceRef[];
  usage?: UsageDto;
}

export interface MessageRepository {
  create(userId: string, input: NewMessage): Promise<Message>;
  /** Inserts a message keyed by idempotencyKey; if the key exists, returns the existing message. */
  insertIfAbsent(
    userId: string,
    input: NewMessage & { idempotencyKey: string },
  ): Promise<{ message: Message; created: boolean }>;
  findByIdempotencyKey(userId: string, key: string): Promise<Message | null>;
  findReplyTo(userId: string, userMessageId: string): Promise<Message | null>;
  update(userId: string, id: string, patch: MessagePatch): Promise<void>;
  deleteById(userId: string, id: string): Promise<void>;
  listByConversation(userId: string, conversationId: string): Promise<Message[]>;
  /** The most recent `limit` messages, oldest first. */
  listRecent(userId: string, conversationId: string, limit: number): Promise<Message[]>;
}
