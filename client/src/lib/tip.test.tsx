import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from '../components/ui/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { Input } from '../components/ui/Input';
import { tip } from './tip';

describe('tip()', () => {
  it('produces the data attributes the tooltip CSS reads', () => {
    expect(tip('Past conversations')).toEqual({ 'data-tip': 'Past conversations', 'data-tip-pos': 'bottom', 'data-tip-align': 'center' });
    expect(tip('Send', 'top', 'end')).toEqual({ 'data-tip': 'Send', 'data-tip-pos': 'top', 'data-tip-align': 'end' });
  });
});

describe('tooltips on icon-only controls', () => {
  it('an icon button shows its label as a tooltip and still has an accessible name', () => {
    render(
      <IconButton aria-label="History" {...tip('Past conversations')}>
        <span>x</span>
      </IconButton>,
    );
    const b = screen.getByRole('button', { name: 'History' });
    expect(b).toHaveAttribute('data-tip', 'Past conversations');
  });

  it('the theme toggle tells you what it will do next', () => {
    localStorage.setItem('shoplens-theme', 'light');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /Theme: light/ })).toHaveAttribute('data-tip', 'Light theme. Click for dark');
    localStorage.clear();
  });

  it('the password show/hide toggle is labelled', () => {
    render(<Input label="Password" type="password" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('data-tip', 'Show password');
  });
});

describe('tooltip and cursor styles', () => {
  const css = readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');

  it('defines the tooltip from the data-tip attribute, in all three placements', () => {
    expect(css).toContain('content: attr(data-tip)');
    expect(css).toContain("[data-tip-pos='top']::after");
    expect(css).toContain("[data-tip-pos='left']::after");
    expect(css).toContain("[data-tip-align='end']::after");
  });

  it('keeps position:relative in the base layer so `absolute` utilities still win', () => {
    expect(css).toMatch(/@layer base \{\s*\[data-tip\] \{\s*position: relative;/);
  });

  it('hides tooltips on touch screens', () => {
    expect(css).toMatch(/@media \(hover: none\) \{\s*\[data-tip\]::after \{\s*display: none;/);
  });

  it('keeps the default focus ring in the base layer, so `outline-none` components get no duplicate box', () => {
    expect(css).toMatch(/@layer base \{\s*:focus-visible \{\s*outline: 2px solid var\(--brand\)/);
  });

  it('gives clickable elements a pointer cursor, and disabled ones not-allowed', () => {
    expect(css).toMatch(/button:not\(:disabled\)[\s\S]*?cursor: pointer;/);
    expect(css).toMatch(/button:disabled[\s\S]*?cursor: not-allowed;/);
  });
});
