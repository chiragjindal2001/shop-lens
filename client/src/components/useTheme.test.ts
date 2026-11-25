import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

const KEY = 'shoplens-theme';
const root = document.documentElement;

/** Pretends the visitor's operating system prefers dark (or light). */
function setOsPrefersDark(dark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  root.classList.remove('dark');
  setOsPrefersDark(false);
});
afterEach(() => root.classList.remove('dark'));

describe('useTheme: light is the default', () => {
  it('starts light when nothing is saved', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('stays light even when the visitor’s operating system prefers dark', () => {
    setOsPrefersDark(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('stays light when storage is blocked', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('light');
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe('useTheme: choices', () => {
  it('dark applies at once and is remembered', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(root.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('dark');
  });

  it('"system" is saved explicitly, and then (only then) follows the OS', () => {
    setOsPrefersDark(true);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('system'));
    expect(localStorage.getItem(KEY)).toBe('system');
    expect(root.classList.contains('dark')).toBe(true); // the OS prefers dark and the visitor asked to follow it
  });

  it('going back to light clears the saved choice (light is what "nothing saved" means)', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    act(() => result.current.setTheme('light'));
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('cycles light → dark → system → light', () => {
    const { result } = renderHook(() => useTheme());
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      act(() => result.current.cycle());
      seen.push(result.current.theme);
    }
    expect(seen).toEqual(['dark', 'system', 'light']);
  });

  it('starts from a saved choice', () => {
    localStorage.setItem(KEY, 'dark');
    const dark = renderHook(() => useTheme());
    expect(dark.result.current.theme).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    dark.unmount();

    root.classList.remove('dark');
    localStorage.setItem(KEY, 'system');
    const system = renderHook(() => useTheme());
    expect(system.result.current.theme).toBe('system');
    expect(root.classList.contains('dark')).toBe(false); // OS prefers light
  });
});

describe('/theme-init.js (runs before first paint, so the page never flashes the wrong theme)', () => {
  const script = readFileSync(path.resolve(__dirname, '../../public/theme-init.js'), 'utf8');
  const run = () => new Function(script)();

  it.each([
    [null, true, false], // nothing saved, OS prefers dark → still light
    [null, false, false],
    ['light', true, false],
    ['dark', false, true],
    ['system', true, true], // chose "System" and the OS prefers dark
    ['system', false, false],
    ['garbage', true, false], // unknown values fall back to light
  ])('saved=%s, OS prefers dark=%s → dark class: %s', (saved, osDark, expected) => {
    setOsPrefersDark(osDark);
    if (saved !== null) localStorage.setItem(KEY, saved);
    run();
    expect(root.classList.contains('dark')).toBe(expected);
  });

  it('agrees with the hook for every combination, so there is no flash when React takes over', () => {
    for (const saved of [null, 'light', 'dark', 'system']) {
      for (const osDark of [true, false]) {
        localStorage.clear();
        root.classList.remove('dark');
        setOsPrefersDark(osDark);
        if (saved !== null) localStorage.setItem(KEY, saved);
        run();
        const before = root.classList.contains('dark');
        const { unmount } = renderHook(() => useTheme());
        expect(root.classList.contains('dark')).toBe(before);
        unmount();
      }
    }
  });
});
