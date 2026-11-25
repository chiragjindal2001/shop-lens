import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SLOW_HINT_AFTER_MS, SLOW_HINT_TEXT, useSlowHint } from './useSlowHint';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('useSlowHint', () => {
  it('turns on only after the wait has lasted 3 seconds', () => {
    const { result } = renderHook(({ active }) => useSlowHint(active), { initialProps: { active: true } });
    expect(result.current).toBe(false);
    tick(SLOW_HINT_AFTER_MS - 1);
    expect(result.current).toBe(false);
    tick(1);
    expect(result.current).toBe(true);
  });

  it('never turns on for a quick request', () => {
    const { result, rerender } = renderHook(({ active }) => useSlowHint(active), { initialProps: { active: true } });
    tick(1200);
    rerender({ active: false }); // the server answered in 1.2 s
    tick(10_000);
    expect(result.current).toBe(false);
  });

  it('turns off again when the request ends, and starts over for the next one', () => {
    const { result, rerender } = renderHook(({ active }) => useSlowHint(active), { initialProps: { active: true } });
    tick(SLOW_HINT_AFTER_MS);
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(false); // the clock restarted
    tick(SLOW_HINT_AFTER_MS);
    expect(result.current).toBe(true);
  });

  it('does nothing while idle, and cleans up its timer', () => {
    const { unmount } = renderHook(() => useSlowHint(true));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    const idle = renderHook(() => useSlowHint(false));
    expect(vi.getTimerCount()).toBe(0);
    idle.unmount();
  });

  it('explains the wait in plain words', () => {
    expect(SLOW_HINT_TEXT).toBe('Waking up the server, this can take up to a minute on the free tier…');
  });
});
