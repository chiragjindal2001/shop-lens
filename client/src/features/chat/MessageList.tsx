import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../../components/ui/Button';
import { Icon } from '../../components/ui/icons';
import { tip } from '../../lib/tip';
import { MessageBubble } from './MessageBubble';
import type { UiMessage } from './useChatStream';

interface Props {
  messages: UiMessage[];
  onRetry(assistantId: string): void;
}

export function MessageList({ messages, onRetry }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [showJump, setShowJump] = useState(false);

  // Follow new content unless the user scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (stick.current !== nearBottom) {
      stick.current = nearBottom;
      setShowJump(!nearBottom);
    }
  }

  function jumpToLatest() {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="scroll-thin h-full space-y-4 overflow-y-auto px-4 py-4" role="log" aria-label="Conversation">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRetry={m.role === 'assistant' ? onRetry : undefined} />
        ))}
      </div>
      {showJump && (
        <IconButton
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
          {...tip('Jump to latest message', 'top')}
          className="animate-fade-up absolute bottom-3 left-1/2 -translate-x-1/2 border border-border bg-surface text-fg shadow-pop"
        >
          <Icon name="arrowDown" />
        </IconButton>
      )}
    </div>
  );
}
