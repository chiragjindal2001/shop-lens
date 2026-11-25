import { ThemeToggle } from '../../components/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/icons';
import { Logo } from '../../components/ui/Logo';
import { tip } from '../../lib/tip';

const LINKS = [
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Your orders' },
  { id: 'help', label: 'Help' },
];

interface Props {
  userName: string;
  onLogout(): void;
}

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function TopNav({ userName, onLogout }: Props) {
  const initial = userName.trim().charAt(0).toUpperCase() || '?';
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Sections" className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => scrollToSection(l.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-fg">
              {l.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <span className="bg-brand-gradient hidden h-8 w-8 place-items-center rounded-full text-[13px] font-semibold text-white sm:grid" aria-hidden {...tip(userName)}>
            {initial}
          </span>
          <span className="hidden max-w-32 truncate text-sm font-medium lg:block">{userName}</span>
          <Button variant="secondary" size="sm" onClick={onLogout} aria-label="Log out" {...tip('Log out', 'bottom', 'end')}>
            <Icon name="logout" size={15} />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
