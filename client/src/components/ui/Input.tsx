import { useId, useState, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, type, className = '', ...rest }: Props) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error ? 'border-red-400' : 'border-slate-300'} ${isPassword ? 'pr-16' : ''} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            className="absolute inset-y-0 right-2 px-2 text-xs font-medium text-slate-500 hover:text-slate-800"
            aria-label={shown ? 'Hide password' : 'Show password'}
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
