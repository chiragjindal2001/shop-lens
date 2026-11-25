import { describe, expect, it } from 'vitest';
import { groupByDate } from './groupByDate';

// A fixed "now": Tuesday 24 Nov 2026, 15:30 local time.
const now = new Date(2026, 10, 24, 15, 30);
const at = (daysAgo: number, hour = 9) => new Date(2026, 10, 24 - daysAgo, hour).toISOString();
const item = (title: string, updatedAt: string) => ({ title, updatedAt });

describe('groupByDate', () => {
  it('buckets conversations into Today, Yesterday, Previous 7 days and Older, keeping order', () => {
    const groups = groupByDate(
      [item('a', at(0, 14)), item('b', at(0, 1)), item('c', at(1)), item('d', at(4)), item('e', at(7)), item('f', at(40))],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.title)])).toEqual([
      ['Today', ['a', 'b']],
      ['Yesterday', ['c']],
      ['Previous 7 days', ['d', 'e']],
      ['Older', ['f']],
    ]);
  });

  it('omits empty groups', () => {
    expect(groupByDate([item('x', at(0))], now).map((g) => g.label)).toEqual(['Today']);
    expect(groupByDate([], now)).toEqual([]);
  });

  it('uses local midnight as the day boundary', () => {
    const justBeforeMidnight = new Date(2026, 10, 23, 23, 59).toISOString();
    const justAfterMidnight = new Date(2026, 10, 24, 0, 1).toISOString();
    const g = groupByDate([item('late', justAfterMidnight), item('early', justBeforeMidnight)], now);
    expect(g.map((x) => x.label)).toEqual(['Today', 'Yesterday']);
  });
});
