import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { UiMessage } from './useChatStream';

interface Props {
  messages: UiMessage[];
  onRetry(assistantId: string): void;
}

export function MessageList({ messages, onRetry }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Auto-scroll to the newest content unless the user scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="flex-1 overflow-y-auto px-4 py-4"
      role="log"
      aria-label="Conversation"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRetry={m.role === 'assistant' ? () => onRetry(m.id) : undefined} />
        ))}
      </div>
    </div>
  );
}
