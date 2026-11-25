import { Button } from '../../components/ui/Button';

interface Props {
  label: string;
  pending: boolean;
  /** Disabled while something else on the page (the demo button) is busy. */
  disabled?: boolean;
}

/** The form's submit button: shows a spinner while pending; the label never changes. */
export function SubmitButton({ label, pending, disabled }: Props) {
  return (
    <Button
      type="submit"
      variant="secondary"
      size="lg"
      className="w-full"
      loading={pending}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
