import type { ComponentProps } from 'react';

interface Props extends ComponentProps<'div'> {
  width: number;
  min: number;
  max: number;
  dragging: boolean;
}

/**
 * The vertical divider between the storefront and the assistant. Drag it, or focus it and use the arrow keys
 * (Shift for bigger steps, Home/End for min/max, Enter or double-click to reset). Desktop only.
 */
export function ResizeHandle({ width, min, max, dragging, className = '', ...rest }: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize assistant panel"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      className={`group relative z-10 hidden w-1.5 shrink-0 cursor-col-resize touch-none items-stretch justify-center outline-none lg:flex ${className}`}
      {...rest}
    >
      {/* A wider invisible hit area, so the 6px line is easy to grab */}
      <span className="absolute inset-y-0 -inset-x-1.5" aria-hidden />
      <span
        className={`w-0.5 rounded-full transition-colors group-hover:bg-brand/60 group-focus-visible:bg-brand ${dragging ? 'bg-brand' : 'bg-transparent'}`}
        aria-hidden
      />
    </div>
  );
}
