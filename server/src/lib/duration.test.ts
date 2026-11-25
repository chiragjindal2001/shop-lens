import { describe, expect, it } from 'vitest';
import { parseDurationSeconds } from './duration';

describe('parseDurationSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['12h', 43_200],
    ['7d', 604_800],
    [' 2H ', 7_200],
    ['1 d', 86_400],
  ])('%s → %s seconds', (input, seconds) => {
    expect(parseDurationSeconds(input)).toBe(seconds);
  });

  it.each(['', 'abc', '15', 'm15', '1.5h', '-5m', '7 days'])('rejects %j', (input) => {
    expect(parseDurationSeconds(input)).toBeNull();
  });
});
