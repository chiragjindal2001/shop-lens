import { useId, useState, type InputHTMLAttributes } from 'react';
import { tip } from '../../lib/tip';
import { Icon } from './icons';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Helper text under the field. Unlike a placeholder it stays visible while the user types. */
  hint?: string;
}

export function Input({ label, error, hint, type, className = '', ...rest }: Props) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined}
          className={`h-11 w-full rounded-xl border bg-surface px-3.5 text-sm text-fg shadow-card transition outline-none placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15 ${
            error ? 'border-danger' : 'border-border'
          } ${isPassword ? 'pr-11' : ''} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            className="absolute inset-y-0 right-1.5 grid w-9 place-items-center rounded-lg text-muted hover:text-fg"
            aria-label={shown ? 'Hide password' : 'Show password'}
            {...tip(shown ? 'Hide password' : 'Show password', 'bottom', 'end')}
          >
            <Icon name={shown ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
