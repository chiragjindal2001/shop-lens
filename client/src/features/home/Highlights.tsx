import { Icon } from '../../components/ui/icons';
import { QUICK_QUESTIONS } from './catalog';

/** Question cards: they show what to ask, and the answer appears in the assistant when you click. */
export function Highlights({ onAsk }: { onAsk(text: string): void }) {
  return (
    <section aria-label="Quick questions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {QUICK_QUESTIONS.map((q) => (
        <button
          key={q.question}
          onClick={() => onAsk(q.question)}
          className="shadow-card group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-brand hover:bg-brand-soft"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-surface">
            <Icon name={q.icon} size={20} />
          </span>
          <span className="min-w-0 flex-1 text-[13.5px] leading-snug font-semibold">{q.question}</span>
          {/* Up-right arrow: "go and ask this" */}
          <Icon name="send" size={14} className="shrink-0 rotate-45 text-muted opacity-0 transition group-hover:text-brand group-hover:opacity-100" />
        </button>
      ))}
    </section>
  );
}
