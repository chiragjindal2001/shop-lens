const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

export const DURATION_PATTERN = /^(\d+)\s*([smhd])$/i;

/** Parses "30s", "15m", "12h" or "7d" into seconds. Returns null for anything else. */
export function parseDurationSeconds(input: string): number | null {
  const match = DURATION_PATTERN.exec(input.trim());
  if (!match) return null;
  return Number(match[1]) * UNIT_SECONDS[match[2]!.toLowerCase() as keyof typeof UNIT_SECONDS];
}
