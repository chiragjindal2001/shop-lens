import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from './chunker';

describe('chunkMarkdown', () => {
  const md = `# Returns Policy

## Return window
You can return most items within 10 days of delivery. The window starts on the day the order is delivered, not the day it was placed. Orders delivered more than 10 days ago are not eligible for a return, but you can still contact support if the item is faulty.

## Refunds
After the returned item passes our quality check the refund goes to the original payment method and takes 5 to 7 business days to show up in your account. Cards, UPI and net banking refunds follow the same timeline, while cash on delivery orders are refunded to the bank account or UPI ID you provide to us.
`;

  it('uses the H1 as the source and one chunk per H2 section', () => {
    const chunks = chunkMarkdown(md, 'fallback');
    expect(chunks.map((c) => c.section)).toEqual(['Return window', 'Refunds']);
    expect(chunks.every((c) => c.source === 'Returns Policy')).toBe(true);
    expect(chunks[0]!.text.startsWith('Returns Policy: Return window\n')).toBe(true);
  });

  it('falls back to the file-derived title when there is no H1', () => {
    expect(chunkMarkdown('## A\nSome body text that is long enough to stand alone as a chunk of its own for sure, yes.', 'Shipping')[0]!.source).toBe('Shipping');
  });

  it('splits an oversized section on paragraph boundaries', () => {
    const para = 'word '.repeat(150).trim(); // ~750 chars
    const chunks = chunkMarkdown(`# Doc\n\n## Big\n${[para, para, para].join('\n\n')}`, 'x');
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 1600)).toBe(true);
    expect(chunks.every((c) => c.section === 'Big')).toBe(true);
  });

  it('merges a tiny trailing section into its neighbour and skips empty sections', () => {
    const chunks = chunkMarkdown(`# Doc\n\n## One\n${'Real content here. '.repeat(20)}\n\n## Empty\n\n## Tiny\nShort.`, 'x');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toContain('Tiny: Short.');
  });
});
