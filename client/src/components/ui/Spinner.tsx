interface Props {
  className?: string;
  /** Decorative spinners (next to a text label) are hidden from screen readers. */
  decorative?: boolean;
}

export function Spinner({ className = 'h-4 w-4', decorative = false }: Props) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      {...(decorative ? { 'aria-hidden': true } : { role: 'status', 'aria-label': 'Loading' })}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" className="opacity-20" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
