const PROMPTS = [
  "Where's my latest order?",
  "What's your return policy?",
  'Can I return my earbuds (SE1042)?',
  'Is cash on delivery available?',
  'Do you deliver to Panipat?',
  'I want to speak to a human',
];

export function SuggestedPrompts({ onPick }: { onPick(text: string): void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl" aria-hidden>🛍️</div>
      <h2 className="mt-3 text-lg font-semibold">How can we help today?</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Ask about your orders, or about shipping, returns, payments and warranty. Try one of these:
      </p>
      <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
