import type { SourceRef, UsageDto } from './schemas/chat.schema';

export type SseEvent =
  | { event: 'meta'; data: { conversationId: string; messageId: string } }
  | { event: 'tool'; data: { name: string; label: string } }
  | { event: 'token'; data: { text: string } }
  | { event: 'sources'; data: { sources: SourceRef[] } }
  | { event: 'usage'; data: UsageDto } // development mode only
  | { event: 'done'; data: { messageId: string } }
  | { event: 'error'; data: { message: string; retryable: boolean } };

export type SseEventName = SseEvent['event'];
