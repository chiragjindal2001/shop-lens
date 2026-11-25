import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { THINKING_LABEL, ToolStatus } from './ToolStatus';

describe('ToolStatus', () => {
  it('while the model works, shows "Virallensing" with three floating dots', () => {
    const { container } = render(<ToolStatus />);
    expect(THINKING_LABEL).toBe('Virallensing');
    expect(screen.getByText('Virallensing')).toBeInTheDocument();
    expect(container.querySelectorAll('.float-dot')).toHaveLength(3);
  });

  it('is announced once, calmly, to screen readers', () => {
    render(<ToolStatus />);
    expect(screen.getByRole('status', { name: 'Assistant is thinking' })).toBeInTheDocument();
    expect(screen.getByText('Virallensing')).toHaveAttribute('aria-hidden', 'true'); // the word is decoration
  });

  it('while a tool runs, shows its label instead (informative beats playful)', () => {
    const { container } = render(<ToolStatus label="Searching our policies…" />);
    expect(screen.getByText('Searching our policies…')).toBeInTheDocument();
    expect(screen.queryByText('Virallensing')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.float-dot')).toHaveLength(0);
  });
});
