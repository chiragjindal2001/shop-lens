import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/icons';
import { SLOW_HINT_TEXT, useSlowHint } from './useSlowHint';

interface Props {
  pending: boolean;
  /** Disabled while something else on the page (the form) is submitting. */
  disabled?: boolean;
  onClick(): void;
}

/**
 * The main call to action on the sign-in screens: most visitors are here to look around, not to register.
 * If the server is slow to answer (free hosting wakes up from sleep), the label explains the wait.
 */
export function DemoButton({ pending, disabled, onClick }: Props) {
  const slow = useSlowHint(pending);
  return (
    <div>
      <Button
        type="button"
        size="lg"
        className={`w-full ${slow ? 'h-auto! min-h-12 py-2.5 leading-snug whitespace-normal!' : ''}`}
        loading={pending}
        disabled={disabled}
        onClick={onClick}
        aria-live="polite"
      >
        {slow ? (
          SLOW_HINT_TEXT
        ) : (
          <>
            <Icon name="sparkles" />
            Try the demo account
          </>
        )}
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
