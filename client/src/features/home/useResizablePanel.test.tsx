import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ResizeHandle } from './ResizeHandle';
import { clampPanelWidth, PANEL_DEFAULT, PANEL_MAX, PANEL_MIN, STOREFRONT_MIN, useResizablePanel } from './useResizablePanel';

const KEY = 'shoplens-assistant-width';
const setViewport = (w: number) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true });

/** A tiny page with the same structure as HomePage: a root, a handle, and a panel that reads --panel-w. */
function Harness() {
  const panel = useResizablePanel();
  return (
    <div ref={panel.rootRef} style={panel.rootStyle} data-testid="root">
      <ResizeHandle width={panel.width} min={panel.min} max={panel.max} dragging={panel.dragging} {...panel.handleProps} />
      <output data-testid="width">{panel.width}</output>
    </div>
  );
}

const handle = () => screen.getByRole('separator', { name: 'Resize assistant panel' });
const width = () => Number(screen.getByTestId('width').textContent);
const cssVar = () => screen.getByTestId('root').style.getPropertyValue('--panel-w');

beforeEach(() => {
  localStorage.clear();
  setViewport(1400);
});
afterEach(() => {
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
});

describe('clampPanelWidth', () => {
  it('keeps the panel between its minimum and maximum', () => {
    expect(clampPanelWidth(100, 1400)).toBe(PANEL_MIN);
    expect(clampPanelWidth(5000, 1400)).toBe(PANEL_MAX);
    expect(clampPanelWidth(500.4, 1400)).toBe(500);
  });
  it('never squeezes the storefront below its minimum', () => {
    expect(clampPanelWidth(700, 1100)).toBe(1100 - STOREFRONT_MIN); // only 620 left for the panel
    expect(clampPanelWidth(700, 700)).toBe(PANEL_MIN); // tiny window: the minimum still wins
  });
});

describe('useResizablePanel', () => {
  it('starts at the default width, exposed as a CSS variable and as ARIA values', () => {
    render(<Harness />);
    expect(width()).toBe(PANEL_DEFAULT);
    expect(cssVar()).toBe(`${PANEL_DEFAULT}px`);
    expect(handle()).toHaveAttribute('aria-valuenow', String(PANEL_DEFAULT));
    expect(handle()).toHaveAttribute('aria-valuemin', String(PANEL_MIN));
    expect(handle()).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('dragging the divider left makes the panel wider, and the final width is remembered', () => {
    render(<Harness />);
    fireEvent.pointerDown(handle(), { button: 0, pointerId: 1, clientX: 1400 - PANEL_DEFAULT });
    expect(document.body.style.cursor).toBe('col-resize'); // no text selection / cursor flicker while dragging

    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 1400 - 600 });
    expect(cssVar()).toBe('600px'); // live update through the CSS variable

    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: 1400 - 600 });
    expect(width()).toBe(600);
    expect(localStorage.getItem(KEY)).toBe('600');
    expect(document.body.style.cursor).toBe('');
  });

  it('dragging is clamped to the limits', () => {
    render(<Harness />);
    fireEvent.pointerDown(handle(), { button: 0, pointerId: 1, clientX: 900 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 0 }); // far left → would be 1400 wide
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: 0 });
    expect(width()).toBe(PANEL_MAX);

    fireEvent.pointerDown(handle(), { button: 0, pointerId: 1, clientX: 600 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 1399 }); // far right → ~1px wide
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: 1399 });
    expect(width()).toBe(PANEL_MIN);
  });

  it('ignores moves when no drag is in progress, and non-primary buttons', () => {
    render(<Harness />);
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 500 });
    expect(width()).toBe(PANEL_DEFAULT);
    fireEvent.pointerDown(handle(), { button: 2, pointerId: 1, clientX: 900 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 500 });
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: 500 });
    expect(width()).toBe(PANEL_DEFAULT);
  });

  it('works from the keyboard: arrows resize, Shift takes bigger steps, Home/End/Enter jump', () => {
    render(<Harness />);
    handle().focus();
    fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    expect(width()).toBe(PANEL_DEFAULT + 24); // left = wider
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    expect(width()).toBe(PANEL_DEFAULT - 24);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft', shiftKey: true });
    expect(width()).toBe(PANEL_DEFAULT - 24 + 96);
    fireEvent.keyDown(handle(), { key: 'End' });
    expect(width()).toBe(PANEL_MAX);
    fireEvent.keyDown(handle(), { key: 'Home' });
    expect(width()).toBe(PANEL_MIN);
    fireEvent.keyDown(handle(), { key: 'Enter' });
    expect(width()).toBe(PANEL_DEFAULT);
    fireEvent.keyDown(handle(), { key: 'a' }); // unrelated keys do nothing
    expect(width()).toBe(PANEL_DEFAULT);
  });

  it('double-click resets to the default and forgets the saved width', () => {
    localStorage.setItem(KEY, '640');
    render(<Harness />);
    expect(width()).toBe(640); // restored from the last visit
    fireEvent.doubleClick(handle());
    expect(width()).toBe(PANEL_DEFAULT);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('a saved width that no longer fits the window is pulled back in range', () => {
    localStorage.setItem(KEY, '750');
    setViewport(900);
    render(<Harness />);
    expect(width()).toBe(900 - STOREFRONT_MIN);
  });

  it('re-clamps when the window shrinks', () => {
    localStorage.setItem(KEY, '700');
    render(<Harness />);
    expect(width()).toBe(700);
    setViewport(1000);
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('width').textContent).toBe(String(1000 - STOREFRONT_MIN));
  });
});
