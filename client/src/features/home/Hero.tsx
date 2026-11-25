import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/icons';
import { MicButton } from '../chat/MicButton';
import { useSpeechInput } from '../chat/useSpeechInput';
import { scrollToSection } from './TopNav';

interface Props {
  firstName: string;
  onAsk(text: string): void;
}

export function Hero({ firstName, onAsk }: Props) {
  const [q, setQ] = useState('');
  const speech = useSpeechInput(q, setQ);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    onAsk(text);
    setQ('');
  }

  return (
    <section className="bg-brand-gradient relative overflow-hidden rounded-3xl p-7 text-white shadow-pop sm:p-10" aria-labelledby="hero-title">
      <div className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-black/20 blur-3xl" aria-hidden />
      <div className="relative max-w-xl">
        <p className="text-sm font-medium text-white/80">Welcome back, {firstName}</p>
        <h1 id="hero-title" className="mt-2 text-[2rem] leading-[1.1] font-bold tracking-tight sm:text-[2.6rem]">
          Smart gear.
          <br />
          Straight answers.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/85">Shop audio, power and accessories. Ask the assistant about your orders, returns and more.</p>

        <form onSubmit={submit} className="mt-6 flex max-w-md items-center gap-2 rounded-2xl bg-white p-1.5 text-slate-900 shadow-lg transition focus-within:ring-4 focus-within:ring-white/40">
          <Icon name="sparkles" className="ml-2.5 shrink-0 text-indigo-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Ask the Shoplens assistant"
            placeholder="Ask Shoplens anything…"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <MicButton speech={speech} className="h-10 w-10" />
          <Button type="submit" size="sm" className="h-10 rounded-xl px-4" disabled={!q.trim()}>
            Ask
          </Button>
        </form>
        {speech.error && (
          <p role="alert" className="mt-2 max-w-md rounded-lg bg-black/25 px-3 py-1.5 text-[13px]">
            {speech.error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2.5">
          <button onClick={() => scrollToSection('products')} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/25">
            Browse products
          </button>
          <button onClick={() => scrollToSection('orders')} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/25">
            Your orders
          </button>
        </div>
      </div>
    </section>
  );
}
