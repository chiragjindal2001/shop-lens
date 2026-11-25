export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

/** Colour of `fg` drawn at `alpha` opacity over an opaque `bg`. */
export function blend(fg: RGB, alpha: number, bg: RGB): RGB {
  return fg.map((c, i) => Math.round(c * alpha + bg[i]! * (1 - alpha))) as RGB;
}

/** WCAG 2.x relative luminance. */
export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1 to 21. Normal text needs at least 4.5 (level AA); large text 3. */
export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

export const WCAG_AA = 4.5;
