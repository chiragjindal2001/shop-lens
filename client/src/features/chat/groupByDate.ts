export interface DateGroup<T> {
  label: string;
  items: T[];
}

const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Buckets items (newest first) into Today / Yesterday / Previous 7 days / Older by their `updatedAt`. */
export function groupByDate<T extends { updatedAt: string }>(items: T[], now = new Date()): DateGroup<T>[] {
  const today = startOfDay(now);
  const groups: DateGroup<T>[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const item of items) {
    const t = new Date(item.updatedAt).getTime();
    const bucket = t >= today ? 0 : t >= today - DAY_MS ? 1 : t >= today - 7 * DAY_MS ? 2 : 3;
    groups[bucket]!.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}
