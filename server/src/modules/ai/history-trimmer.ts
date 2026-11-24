import type { Message } from '../chat/message.repository';
import type { LlmMessage } from './llm-client';

export const HISTORY_MESSAGE_LIMIT = 10;
const CHAR_BUDGET = 12_000; // rough stand-in for a token budget (~3k tokens)

/** Keeps the most recent messages that fit the budget, dropping the oldest first. */
export function trimHistory(messages: Message[]): LlmMessage[] {
  const usable = messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-HISTORY_MESSAGE_LIMIT);

  const kept: Message[] = [];
  let used = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    const m = usable[i]!;
    if (used + m.content.length > CHAR_BUDGET && kept.length > 0) break;
    used += m.content.length;
    kept.unshift(m);
  }
  return kept.map((m) => ({ role: m.role, content: m.content }) as LlmMessage);
}
