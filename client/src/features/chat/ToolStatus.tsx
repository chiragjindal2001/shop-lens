import { Spinner } from '../../components/ui/Spinner';

/** "Checking your order…" status line; doubles as the typing indicator. */
export function ToolStatus({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
      {label ? <Spinner className="h-3.5 w-3.5" /> : <TypingDots />}
      <span>{label ?? 'Shoplens is typing'}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}
