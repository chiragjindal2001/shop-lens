import { useEffect, useState, type RefObject } from 'react';
import { Banner } from '../../components/ui/Banner';
import { Button, IconButton } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/icons';
import { LogoMark } from '../../components/ui/Logo';
import { Skeleton } from '../../components/ui/Skeleton';
import { tip } from '../../lib/tip';
import { Composer } from './Composer';
import { HistoryList } from './HistoryList';
import { loadMarkdown } from './MessageBubble';
import { MessageList } from './MessageList';
import type { useChatStream } from './useChatStream';
import type { useConversations } from './useConversations';

const PROMPTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'package', title: 'Track my latest order', text: "Where's my latest order?" },
  { icon: 'undo', title: 'Returns', text: "What's your return policy?" },
  { icon: 'card', title: 'Payments', text: 'Is cash on delivery available?' },
  { icon: 'headset', title: 'Talk to a human', text: 'I want to speak to a human' },
];

interface Props {
  className?: string;
  chat: ReturnType<typeof useChatStream>;
  conversations: ReturnType<typeof useConversations>;
  activeId?: string;
  firstName: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onNewChat(): void;
  onSelect(id: string): void;
  onDelete(id: string): void;
  /** Mobile only: close the slide-over. */
  onClose(): void;
}

export function AssistantPanel({ className = '', chat, conversations, activeId, firstName, textareaRef, onNewChat, onSelect, onDelete, onClose }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const empty = chat.messages.length === 0 && !chat.loadingConversation;

  // Fetch the markdown renderer right after first paint, not on the critical path.
  useEffect(() => {
    const t = setTimeout(() => void loadMarkdown(), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <aside aria-label="Shoplens assistant" className={`flex min-h-0 flex-col bg-surface ${className}`}>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <LogoMark size={34} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] leading-tight font-semibold">Shoplens Assistant</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            Online · answers from our policies
          </p>
        </div>
        <IconButton onClick={() => setHistoryOpen((o) => !o)} aria-label="History" aria-pressed={historyOpen} className={historyOpen ? 'bg-brand-soft text-brand' : ''} {...tip('Past conversations')}>
          <Icon name="clock" />
        </IconButton>
        <IconButton
          onClick={() => {
            setHistoryOpen(false);
            onNewChat();
          }}
          aria-label="New chat"
          {...tip('New chat', 'bottom', 'end')}
        >
          <Icon name="plus" />
        </IconButton>
        <IconButton onClick={onClose} aria-label="Close assistant" className="lg:hidden" {...tip('Close assistant', 'bottom', 'end')}>
          <Icon name="x" />
        </IconButton>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {chat.loadingConversation ? (
          <div className="space-y-4 p-4" aria-busy="true">
            <Skeleton className="ml-auto h-10 w-2/3" />
            <Skeleton className="h-20 w-5/6" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : empty ? (
          <EmptyState firstName={firstName} onPick={(t) => void chat.send(t)} />
        ) : (
          <MessageList messages={chat.messages} onRetry={chat.retryMessage} />
        )}

        {chat.sendError && (
          <div className="px-3 pb-2">
            <Banner>
              <div className="flex items-center justify-between gap-3">
                <span>{chat.sendError.message}</span>
                <Button variant="secondary" size="sm" onClick={chat.retrySendError}>
                  Retry
                </Button>
              </div>
            </Banner>
          </div>
        )}

        <Composer streaming={chat.streaming} onSend={(t) => void chat.send(t)} onStop={chat.stop} textareaRef={textareaRef} />

        {historyOpen && (
          <div className="animate-fade-up absolute inset-0 z-10 flex flex-col bg-surface">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h3 className="text-sm font-semibold">History</h3>
              <IconButton onClick={() => setHistoryOpen(false)} aria-label="Close history" {...tip('Close', 'bottom', 'end')}>
                <Icon name="x" />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1">
              <HistoryList
                items={conversations.items}
                activeId={activeId}
                loading={conversations.loading}
                error={conversations.error}
                hasMore={conversations.hasMore}
                onLoadMore={conversations.loadMore}
                onSelect={(id) => {
                  setHistoryOpen(false);
                  onSelect(id);
                }}
                onDelete={onDelete}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function EmptyState({ firstName, onPick }: { firstName: string; onPick(text: string): void }) {
  return (
    <div className="scroll-thin flex flex-1 flex-col justify-center overflow-y-auto px-5 py-6">
      <div className="animate-fade-up">
        <LogoMark size={48} />
        <h3 className="mt-4 text-xl font-bold tracking-tight">Hi {firstName}, how can I help?</h3>
        <p className="mt-1.5 text-sm text-muted">Ask about your orders, returns, shipping, payments or warranty. I'll use your account and our policies to answer.</p>
      </div>
      <div className="mt-5 grid gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p.text}
            onClick={() => onPick(p.text)}
            className="group shadow-card flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left transition hover:border-brand hover:bg-brand-soft"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-surface">
              <Icon name={p.icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold">{p.title}</span>
              <span className="block truncate text-[12.5px] text-muted">{p.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
