import { Button } from '../../components/ui/Button';
import { SLOW_HINT_TEXT, useSlowHint } from './useSlowHint';

interface Props {
  label: string;
  pending: boolean;
  /** Disabled while something else on the page (the demo button) is busy. */
  disabled?: boolean;
}

/** The form's submit button: shows a spinner while pending, and explains the wait if the server is slow to wake. */
export function SubmitButton({ label, pending, disabled }: Props) {
  const slow = useSlowHint(pending);
  return (
    <Button
      type="submit"
      variant="secondary"
      size="lg"
      className={`w-full ${slow ? 'h-auto! min-h-12 py-2.5 leading-snug whitespace-normal!' : ''}`}
      loading={pending}
      disabled={disabled}
      aria-live="polite"
    >
      {slow ? SLOW_HINT_TEXT : label}
    </Button>
  );
}
