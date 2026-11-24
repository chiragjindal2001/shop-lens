import type { ReactNode } from 'react';

export function Banner({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}
