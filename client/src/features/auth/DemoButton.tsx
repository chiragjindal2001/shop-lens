import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/icons';

interface Props {
  pending: boolean;
  /** Disabled while something else on the page (the form) is submitting. */
  disabled?: boolean;
  onClick(): void;
}

/**
 * The main call to action on the sign-in screens: most visitors are here to look around, not to register.
 * While it works it shows a spinner; the label never changes.
 */
export function DemoButton({ pending, disabled, onClick }: Props) {
  return (
    <div>
      <Button
        type="button"
        size="lg"
        className="w-full"
        loading={pending}
        disabled={disabled}
        onClick={onClick}
      >
        <Icon name="sparkles" />
        Try the demo account
      </Button>
      <p className="mt-2 text-center text-[13px] text-muted">One click, no signup. Comes with sample orders.</p>
    </div>
  );
}

/** "or log in with your account": the line between the demo button and the form. */
export function OrDivider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 py-5 text-[13px] text-muted" role="separator">
      <span className="h-px flex-1 bg-border" aria-hidden />
      {children}
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}
