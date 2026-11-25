import '@testing-library/jest-dom/vitest';

// jsdom has no PointerEvent, so synthetic pointer events would lose button, clientX and pointerId.
// A MouseEvent carrying a pointerId is all the drag-to-resize tests need.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
