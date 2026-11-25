import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../limits';

export { MAX_MESSAGE_LENGTH };

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1).max(64).optional(),
  message: z.string().trim().min(1, 'Message is required').max(MAX_MESSAGE_LENGTH),
  idempotencyKey: z.string().min(8).max(100),
});

export const historyQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'complete' | 'partial' | 'error';

export interface SourceRef {
  source: string;
  section?: string;
}

export interface ToolCallRecord {
  name: string;
  args: unknown;
  ok: boolean;
}

/** Token usage and cost for one assistant reply. Only produced in development mode. */
export interface UsageDto {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** USD, as reported by OpenRouter. null when the provider reported no cost. */
  costUsd: number | null;
  /** Number of model calls behind this reply (more than one when tools were used). */
  llmCalls: number;
}

export interface ConversationDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls: ToolCallRecord[];
  sources: SourceRef[];
  status: MessageStatus;
  /** Only on user messages; lets the client retry with the same key. */
  idempotencyKey?: string;
  /** Present only when the server runs in development mode. */
  usage?: UsageDto;
  createdAt: string;
}

export interface HistoryResponse {
  conversations: ConversationDto[];
  nextCursor: string | null;
}

export interface ConversationResponse {
  conversation: ConversationDto;
  messages: MessageDto[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
