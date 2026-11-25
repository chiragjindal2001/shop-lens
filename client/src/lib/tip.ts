export type TipPos = 'top' | 'bottom' | 'left';
export type TipAlign = 'center' | 'start' | 'end';

/**
 * Props for a hover/focus tooltip (styled in index.css): `<button {...tip('Past conversations')}>`.
 * Use align "end" for controls at the right edge of the window and pos "left" inside scrolling lists, so the
 * label is never clipped. Icon-only buttons should also keep an aria-label: the tooltip is for sighted users.
 */
export const tip = (label: string, pos: TipPos = 'bottom', align: TipAlign = 'center') => ({
  'data-tip': label,
  'data-tip-pos': pos,
  'data-tip-align': align,
});
