export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Cursors are opaque to callers: base64url of "<ISO date>|<id>". */
export function encodeCursor(date: Date, id: string): string {
  return Buffer.from(`${date.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { date: Date; id: string } | null {
  try {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    const date = new Date(iso ?? '');
    if (!id || Number.isNaN(date.getTime())) return null;
    return { date, id };
  } catch {
    return null;
  }
}
