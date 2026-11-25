import { describe, expect, it } from 'vitest';
import { blend, contrastRatio, hexToRgb, WCAG_AA } from '../../lib/contrast';
import { PANEL_FROM, PANEL_GRADIENT, PANEL_TEXT_ALPHA, PANEL_TO } from './panelTheme';

const WHITE = hexToRgb('#ffffff');
/** Body text colour as the eye sees it: near-opaque white over the gradient at a given point. */
const textOn = (bg: string) => contrastRatio(blend(WHITE, PANEL_TEXT_ALPHA, hexToRgb(bg)), hexToRgb(bg));

describe('brand panel contrast (WCAG AA = 4.5:1 for normal text)', () => {
  it('body text passes AA at both ends of the gradient, and so everywhere between', () => {
    // Luminance changes monotonically along the gradient, so the two ends are the extremes.
    expect(textOn(PANEL_FROM)).toBeGreaterThanOrEqual(WCAG_AA);
    expect(textOn(PANEL_TO)).toBeGreaterThanOrEqual(WCAG_AA);
  });

  it('the solid-white headline passes AA too', () => {
    expect(contrastRatio(WHITE, hexToRgb(PANEL_FROM))).toBeGreaterThanOrEqual(WCAG_AA);
    expect(contrastRatio(WHITE, hexToRgb(PANEL_TO))).toBeGreaterThanOrEqual(WCAG_AA);
  });

  it('is the fix for a real problem: the old gradient and 60% / 75% white text failed AA', () => {
    const oldLightestCorner = '#9b5cf6';
    const oldFooter = contrastRatio(blend(WHITE, 0.6, hexToRgb(oldLightestCorner)), hexToRgb(oldLightestCorner));
    const oldDescription = contrastRatio(blend(WHITE, 0.75, hexToRgb(oldLightestCorner)), hexToRgb(oldLightestCorner));
    expect(oldFooter).toBeLessThan(3); // "barely visible"
    expect(oldDescription).toBeLessThan(WCAG_AA);
  });

  it('builds the gradient from the same two colours', () => {
    expect(PANEL_GRADIENT).toContain(PANEL_FROM);
    expect(PANEL_GRADIENT).toContain(PANEL_TO);
  });
});
