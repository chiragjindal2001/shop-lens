import type { ReactNode } from 'react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Icon, type IconName } from '../../components/ui/icons';
import { Logo, LogoMark } from '../../components/ui/Logo';
import { ChatPreview } from './ChatPreview';
import { PANEL_GRADIENT, PANEL_TEXT_ALPHA } from './panelTheme';

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'package', title: 'Track every order', text: 'Ask where your order is and get a straight answer.' },
  { icon: 'undo', title: 'Returns and cancellations', text: 'Start a return or cancel an order right from the chat.' },
  { icon: 'shield', title: 'Answers you can trust', text: 'Policy answers come from our own documents, with the source shown.' },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/*
        Brand panel (desktop). Layout: logo at the top, content in the middle, footer at the bottom. All three sit in
        the same centered column (mx-auto max-w-xl), so they share one left edge and read as a single block.
        Spacing between the pieces is explicit margins (not flex gap), so it stays correct whatever the container does.
        Body text inherits one near-opaque white; see panelTheme.ts for the contrast numbers.
      */}
      <aside
        className="relative hidden overflow-hidden px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16"
        style={{ backgroundImage: PANEL_GRADIENT, color: `rgb(255 255 255 / ${PANEL_TEXT_ALPHA})` }}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/20 blur-3xl" aria-hidden />

        <div className="relative mx-auto flex w-full max-w-xl items-center gap-2.5 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-[28%] bg-white/20">
            <Icon name="search" size={20} strokeWidth={2.4} />
          </span>
          <span className="text-lg font-bold tracking-tight">Shoplens</span>
        </div>

        <div className="relative mx-auto w-full max-w-xl py-12">
          <h2 className="text-4xl leading-[1.1] font-bold tracking-tight text-white xl:text-5xl">
            Smart gear.
            <br />
            Straight answers.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed">Shop audio, power and accessories, with an AI assistant that actually knows your orders.</p>

          {/* The product, before login */}
          <div className="mt-10">
            <ChatPreview />
          </div>

          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
                  <Icon name={p.icon} size={21} />
                </span>
                <span>
                  <span className="block text-base font-semibold text-white">{p.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mx-auto w-full max-w-xl text-[13px] font-medium text-white">A demo store. Prices in ₹.</p>
      </aside>

      {/* Form */}
      <main className="relative flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle tipAlign="end" />
        </div>
        <div className="mx-auto w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-7 hidden lg:block">
            <LogoMark size={44} />
          </div>
          <h1 className="text-[1.75rem] font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
