/**
 * Colours of the brand panel on the sign-in screens. The old gradient (#5b5ff1 to #9b5cf6) with 60-75% white
 * text measured about 3.2:1 at its lightest corner, below WCAG AA. These are darker, and the text is nearly
 * opaque; panelTheme.test.ts checks the ratio on the real numbers, so the contrast can't quietly regress.
 */
export const PANEL_FROM = '#4f46e5';
export const PANEL_TO = '#7c3aed';
/** Opacity of the white body text on the panel (the headline is solid white). */
export const PANEL_TEXT_ALPHA = 0.92;

export const PANEL_GRADIENT = `linear-gradient(135deg, ${PANEL_FROM}, ${PANEL_TO})`;
