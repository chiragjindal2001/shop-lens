import Markdown from 'react-markdown';
import { Button } from '../../components/ui/Button';
import type { UsageDto } from '@shared';
import type { UiMessage } from './useChatStream';
import { ToolStatus } from './ToolStatus';

export function MessageBubble({ message, onRetry }: { message: UiMessage; onRetry?: () => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2 text-sm text-white sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting = message.streaming && !message.content;
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm sm:max-w-[75%]">
        {message.toolLabel && <ToolStatus label={message.toolLabel} />}
        {waiting && !message.toolLabel && <ToolStatus />}
        {message.content && (
          <div className="md break-words">
            <Markdown>{message.content}</Markdown>
          </div>
        )}
        {message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {message.sources.map((s) => (
              <span key={`${s.source}-${s.section ?? ''}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                Source: {s.source}
              </span>
            ))}
          </div>
        )}
        {import.meta.env.DEV && message.usage && !message.streaming && <UsageLine usage={message.usage} />}
        {!message.streaming && message.status !== 'complete' && (
          <div className="flex items-center gap-3 border-t border-slate-100 pt-2 text-xs text-amber-700">
            <span>{message.status === 'partial' ? 'This reply was interrupted.' : "I couldn't get an answer."}</span>
            {onRetry && (
              <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function formatCost(costUsd: number | null): string {
  if (costUsd === null) return 'cost n/a';
  if (costUsd === 0) return '$0 (free)';
  return '$' + (costUsd < 0.01 ? costUsd.toFixed(6) : costUsd.toFixed(4));
}

/** Development-only: tokens and cost for this reply. Never rendered in production builds. */
function UsageLine({ usage }: { usage: UsageDto }) {
  const calls = usage.llmCalls > 1 ? ' · ' + usage.llmCalls + ' calls' : '';
  return (
    <p className="border-t border-dashed border-slate-200 pt-1 font-mono text-[11px] text-slate-400" data-testid="usage-line">
      {usage.model} · {usage.promptTokens} in / {usage.completionTokens} out ({usage.totalTokens} total) ·{' '}
      {formatCost(usage.costUsd)}
      {calls}
    </p>
  );
}
