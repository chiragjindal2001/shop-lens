import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { POPULAR_QUESTIONS, QUICK_QUESTIONS } from './catalog';
import { Highlights } from './Highlights';

describe('Highlights (quick question cards)', () => {
  it('each card shows a question, not an answer', () => {
    render(<Highlights onAsk={vi.fn()} />);
    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(4);
    for (const card of cards) expect(card.textContent).toMatch(/\?$/);
    // The old cards spelled out the answer; none of that text is left.
    expect(screen.queryByText(/₹499 and above/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1 year on most electronics/)).not.toBeInTheDocument();
  });

  it('clicking a card sends exactly the question that is on it', async () => {
    const onAsk = vi.fn();
    render(<Highlights onAsk={onAsk} />);
    for (const { question } of QUICK_QUESTIONS) await userEvent.click(screen.getByRole('button', { name: question }));
    expect(onAsk.mock.calls.map((c) => c[0])).toEqual(QUICK_QUESTIONS.map((q) => q.question));
  });

  it('does not repeat a question that is also in "Popular questions" further down the page', () => {
    const popular = new Set(POPULAR_QUESTIONS.map((q) => q.toLowerCase()));
    for (const { question } of QUICK_QUESTIONS) expect(popular.has(question.toLowerCase())).toBe(false);
  });
});
