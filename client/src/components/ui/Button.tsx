import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

const styles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
};

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
