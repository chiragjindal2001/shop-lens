import { Spinner } from '../../components/ui/Spinner';

/** Shown, followed by floating dots, while the assistant works on an answer. */
export const THINKING_LABEL = 'Virallensing';

/**
 * What the assistant is doing right now. With a label ("Searching our policies…") a tool is running. Without
 * one the model is still working on its answer, so "Virallensing" with floating dots is shown.
 */
export function ToolStatus({ label }: { label?: string }) {
  if (label) {
    return (
      <div className="flex items-center gap-2 text-[13px] font-medium" aria-live="polite">
        <Spinner decorative className="h-3.5 w-3.5 text-brand" />
        <span className="shimmer-text">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted" role="status" aria-label="Assistant is thinking">
      <span className="shimmer-text" aria-hidden="true">
        {THINKING_LABEL}
      </span>
      <span className="flex items-end gap-0.75 pb-0.75" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="float-dot size-1.25 rounded-full bg-brand" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
    </div>
  );
}
