import { POPULAR_QUESTIONS } from './catalog';

export function HelpSection({ onAsk }: { onAsk(text: string): void }) {
  return (
    <section id="help" aria-labelledby="help-title" className="scroll-mt-24">
      <h2 id="help-title" className="text-xl font-bold tracking-tight">
        Popular questions
      </h2>
      <p className="mb-4 text-sm text-muted">Tap one and the assistant answers from our policies.</p>
      <div className="flex flex-wrap gap-2">
        {POPULAR_QUESTIONS.map((q) => (
          <button key={q} onClick={() => onAsk(q)} className="rounded-full border border-border bg-surface px-3.5 py-2 text-[13.5px] font-medium transition hover:border-brand hover:bg-brand-soft hover:text-brand">
            {q}
          </button>
        ))}
      </div>
    </section>
  );
}
