import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.resolve(__dirname, 'index.css'), 'utf8');
const html = readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('phones: no zoom-in when a text field is tapped (iOS Safari zooms any field under 16px and stays zoomed)', () => {
  /** The body of the touch-screen media query that sets the field size. */
  const touchRule = /@media \(hover: none\) and \(pointer: coarse\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

  it('text fields are 16px on touch screens', () => {
    expect(touchRule).toMatch(/\binput:not\(/);
    expect(touchRule).toMatch(/\btextarea\b/);
    expect(touchRule).toMatch(/\bselect\b/);
    expect(touchRule).toMatch(/font-size:\s*16px/);
  });

  it('buttons, checkboxes and the like are not affected', () => {
    for (const type of ['checkbox', 'radio', 'button', 'submit']) expect(touchRule).toContain(`[type='${type}']`);
  });

  it('is not inside a cascade layer, so it beats the text-sm / text-[14.5px] utilities', () => {
    const start = css.indexOf('@media (hover: none) and (pointer: coarse)');
    expect(start).toBeGreaterThan(-1);
    // Count the @layer blocks still open at that point: none may be.
    let depth = 0;
    const layers: number[] = [];
    for (let i = 0; i < start; i++) {
      if (css.startsWith('@layer', i) && css.slice(i).match(/^@layer[^;{]*\{/)) layers.push(depth + 1);
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        while (layers.length && layers[layers.length - 1]! > depth) layers.pop();
      }
    }
    expect(layers).toHaveLength(0);
  });

  it('every text field in the app is smaller than 16px on desktop, which is exactly why the rule is needed', () => {
    const fields = ['components/ui/Input.tsx', 'features/home/Hero.tsx', 'features/chat/Composer.tsx'].map((f) =>
      readFileSync(path.resolve(__dirname, f), 'utf8'),
    );
    for (const source of fields) expect(source).toMatch(/text-sm|text-\[14\.5px\]/);
  });

  it('pinch-zoom is NOT disabled (that would harm accessibility): no maximum-scale and no user-scalable=no', () => {
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(html)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/maximum-scale|user-scalable\s*=\s*(no|0)/);
  });
});
