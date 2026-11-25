import { describe, expect, it } from 'vitest';
import { blend, contrastRatio, hexToRgb, luminance, WCAG_AA } from './contrast';

const WHITE = hexToRgb('#ffffff');
const BLACK = hexToRgb('#000000');

describe('contrast helpers (WCAG 2.x)', () => {
  it('matches the published reference ratios', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 1);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
    expect(contrastRatio(hexToRgb('#767676'), WHITE)).toBeCloseTo(4.54, 1); // the classic "just passes AA" grey
    expect(contrastRatio(hexToRgb('#777777'), WHITE)).toBeLessThan(WCAG_AA);
  });

  it('is symmetric', () => {
    const a = hexToRgb('#4f46e5');
    expect(contrastRatio(a, WHITE)).toBeCloseTo(contrastRatio(WHITE, a), 10);
  });

  it('parses hex and computes luminance', () => {
    expect(hexToRgb('#4f46e5')).toEqual([79, 70, 229]);
    expect(luminance(BLACK)).toBe(0);
    expect(luminance(WHITE)).toBeCloseTo(1, 5);
  });

  it('blends a translucent colour over a background', () => {
    expect(blend(WHITE, 0.5, BLACK)).toEqual([128, 128, 128]);
    expect(blend(WHITE, 1, hexToRgb('#123456'))).toEqual(WHITE);
    expect(blend(WHITE, 0, hexToRgb('#123456'))).toEqual(hexToRgb('#123456'));
  });
});
