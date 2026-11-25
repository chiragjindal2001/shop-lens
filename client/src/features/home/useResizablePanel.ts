import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

const STORAGE_KEY = 'shoplens-assistant-width';

export const PANEL_MIN = 320;
export const PANEL_MAX = 760;
export const PANEL_DEFAULT = 448;
/** The storefront never gets squeezed below this. */
export const STOREFRONT_MIN = 480;

/** Keeps the panel between its min/max, and leaves the storefront at least STOREFRONT_MIN pixels. */
export function clampPanelWidth(width: number, viewportWidth: number): number {
  const max = Math.max(PANEL_MIN, Math.min(PANEL_MAX, viewportWidth - STOREFRONT_MIN));
  return Math.round(Math.min(max, Math.max(PANEL_MIN, width)));
}

function readStored(): number | null {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function store(width: number | null) {
  try {
    if (width === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    /* storage blocked: the width just won't be remembered */
  }
}

const STEP = 24;
const BIG_STEP = 96;

/**
 * Drag, keyboard and double-click resizing for a panel docked to the right edge of the window.
 * While dragging, the width is written straight to a CSS variable (no React re-render per mouse move);
 * it is committed to state, and remembered in localStorage, when the pointer is released.
 */
export function useResizablePanel() {
  const [width, setWidth] = useState(() => clampPanelWidth(readStored() ?? PANEL_DEFAULT, window.innerWidth));
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const live = useRef(width);
  const active = useRef(false);

  const commit = useCallback((w: number) => {
    const next = clampPanelWidth(w, window.innerWidth);
    live.current = next;
    setWidth(next);
    store(next === PANEL_DEFAULT ? null : next);
  }, []);

  // Keep the layout valid when the window itself is resized.
  useEffect(() => {
    const onResize = () => setWidth((w) => clampPanelWidth(w, window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    active.current = true;
    setDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!active.current) return;
    const next = clampPanelWidth(window.innerWidth - e.clientX, window.innerWidth);
    live.current = next;
    rootRef.current?.style.setProperty('--panel-w', next + 'px');
  }, []);

  const endDrag = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!active.current) return;
      active.current = false;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setDragging(false);
      commit(live.current);
    },
    [commit],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const step = e.shiftKey ? BIG_STEP : STEP;
      let next: number | null = null;
      // The panel sits on the right, so moving the divider left makes it wider.
      if (e.key === 'ArrowLeft') next = live.current + step;
      else if (e.key === 'ArrowRight') next = live.current - step;
      else if (e.key === 'Home') next = PANEL_MIN;
      else if (e.key === 'End') next = PANEL_MAX;
      else if (e.key === 'Enter') next = PANEL_DEFAULT;
      if (next === null) return;
      e.preventDefault();
      commit(next);
    },
    [commit],
  );

  const reset = useCallback(() => commit(PANEL_DEFAULT), [commit]);

  return {
    width,
    dragging,
    rootRef,
    /** Put on the element that contains both the storefront and the panel. */
    rootStyle: { '--panel-w': `${width}px` } as CSSProperties,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onKeyDown, onDoubleClick: reset },
    min: PANEL_MIN,
    max: Math.max(PANEL_MIN, Math.min(PANEL_MAX, window.innerWidth - STOREFRONT_MIN)),
  };
}
