import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const KEY = 'shoplens-theme';
const ORDER: Theme[] = ['light', 'dark', 'system'];

function readStored(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system'; // storage blocked (private mode etc.)
  }
}

const systemPrefersDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

export const isDark = (t: Theme) => t === 'dark' || (t === 'system' && systemPrefersDark());

export function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle('dark', isDark(t));
}

/** Light / dark / follow-the-system, remembered in localStorage. The initial class is set by /theme-init.js. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStored);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system' || typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    try {
      if (t === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
  }, []);

  const cycle = useCallback(() => setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!), [setTheme, theme]);

  return { theme, setTheme, cycle };
}
