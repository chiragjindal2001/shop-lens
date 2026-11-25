import type { Message } from '../chat/message.repository';
import type { LlmMessage } from './llm-client';

export interface HistoryOptions {
  /** Most recent messages to keep (HISTORY_MAX_MESSAGES). */
  maxMessages: number;
  /** Rough stand-in for a token budget: ~4 characters per token (HISTORY_MAX_CHARS). */
  maxChars: number;
}

export const DEFAULT_HISTORY: HistoryOptions = { maxMessages: 10, maxChars: 12_000 };

/** Keeps the most recent messages that fit the budget, dropping the oldest first. */
export function trimHistory(messages: Message[], opts: HistoryOptions = DEFAULT_HISTORY): LlmMessage[] {
  const usable = messages.filter((m) => m.content.trim().length > 0).slice(-opts.maxMessages);

  const kept: Message[] = [];
  let used = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    const m = usable[i]!;
    if (used + m.content.length > opts.maxChars && kept.length > 0) break;
    used += m.content.length;
    kept.unshift(m);
  }
  return kept.map((m) => ({ role: m.role, content: m.content }) as LlmMessage);
}
