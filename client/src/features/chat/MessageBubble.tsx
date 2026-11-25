import { lazy, memo, Suspense } from 'react';
import type { UsageDto } from '@shared';
import { Button } from '../../components/ui/Button';
import { LogoMark } from '../../components/ui/Logo';
import { ToolStatus } from './ToolStatus';
import type { UiMessage } from './useChatStream';

// The markdown parser is a separate chunk: start loading it as soon as the chat is on screen, render plain
// text for the instant it takes to arrive.
export const loadMarkdown = () => import('./Markdown');
const Markdown = lazy(loadMarkdown);

interface Props {
  message: UiMessage;
  /** Stable callback taking the message id, so memoized bubbles are not re-rendered by a new function. */
  onRetry?: (id: string) => void;
}

function MessageBubbleImpl({ message, onRetry }: Props) {
  if (message.role === 'user') {
    return (
      <div className="animate-fade-up flex justify-end">
        <div className="bg-brand-gradient max-w-[88%] rounded-2xl rounded-br-md px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap text-white shadow-sm wrap-anywhere">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting = message.streaming && !message.content;
  const sources = uniqueSources(message);
  return (
    <div className="animate-fade-up flex items-start gap-2.5">
      <LogoMark size={26} className="mt-0.5" />
      <div className="min-w-0 max-w-[92%] space-y-2">
        <div className="rounded-2xl rounded-tl-md bg-surface-2 px-4 py-2.5 text-[14.5px]">
          {message.toolLabel && <ToolStatus label={message.toolLabel} />}
          {waiting && !message.toolLabel && <ToolStatus />}
          {message.content && (
            <div className="md">
              <Suspense fallback={<p className="whitespace-pre-wrap">{message.content}</p>}>
                <Markdown>{message.content}</Markdown>
              </Suspense>
              {message.streaming && <span className="stream-caret" aria-hidden="true" />}
            </div>
          )}
        </div>

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {sources.map((s) => (
              <span key={s} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11.5px] font-medium text-muted">
                Source: {s}
              </span>
            ))}
          </div>
        )}

        {import.meta.env.DEV && message.usage && !message.streaming && <UsageLine usage={message.usage} />}

        {!message.streaming && message.status !== 'complete' && (
          <div className="flex items-center gap-3 px-1 text-xs text-warn">
            <span>{message.status === 'partial' ? 'This reply was interrupted.' : "I couldn't get an answer."}</span>
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={() => onRetry(message.id)}>
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Each document once, even when several of its sections were used. */
function uniqueSources(m: UiMessage): string[] {
  return [...new Set(m.sources.map((s) => s.source))];
}

export const MessageBubble = memo(MessageBubbleImpl);

export function formatCost(costUsd: number | null): string {
  if (costUsd === null) return 'cost n/a';
  if (costUsd === 0) return '$0 (free)';
  return '$' + (costUsd < 0.01 ? costUsd.toFixed(6) : costUsd.toFixed(4));
}

/** Development-only: tokens and cost for this reply. Never rendered in production builds. */
function UsageLine({ usage }: { usage: UsageDto }) {
  const calls = usage.llmCalls > 1 ? ' · ' + usage.llmCalls + ' calls' : '';
  return (
    <p className="px-1 font-mono text-[11px] text-muted/80" data-testid="usage-line">
      {usage.model} · {usage.promptTokens} in / {usage.completionTokens} out ({usage.totalTokens} total) ·{' '}
      {formatCost(usage.costUsd)}
      {calls}
    </p>
  );
}
