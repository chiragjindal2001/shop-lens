import type { ReactNode } from 'react';
import { Icon } from './icons';

type Tone = 'error' | 'info' | 'success';

const TONES: Record<Tone, string> = {
  error: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
};

export function Banner({ children, tone = 'error' }: { children: ReactNode; tone?: Tone }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] ${TONES[tone]}`}>
      <Icon name={tone === 'success' ? 'check' : 'alert'} size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
