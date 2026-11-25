import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root.classList.remove('dark');
});
afterEach(() => root.classList.remove('dark'));

describe('useTheme', () => {
  it('defaults to following the system and applies an explicit choice immediately', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');

    act(() => result.current.setTheme('dark'));
    expect(root.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('shoplens-theme')).toBe('dark');

    act(() => result.current.setTheme('light'));
    expect(root.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('shoplens-theme')).toBe('light');
  });

  it('"system" clears the saved choice', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    act(() => result.current.setTheme('system'));
    expect(localStorage.getItem('shoplens-theme')).toBeNull();
  });

  it('cycles light → dark → system → light', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      act(() => result.current.cycle());
      seen.push(result.current.theme);
    }
    expect(seen).toEqual(['dark', 'system', 'light']);
  });

  it('starts from the saved choice', () => {
    localStorage.setItem('shoplens-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
  });
});
