import { useEffect, useState } from 'react';

export const SLOW_HINT_AFTER_MS = 3000;
export const SLOW_HINT_TEXT = 'Waking up the server, this can take up to a minute on the free tier…';

/**
 * True once `active` has stayed true for `afterMs`. Free hosting puts the API to sleep when idle, and the first
 * request afterwards can take 30-60 seconds; without an explanation a silent spinner looks like a broken app.
 */
export function useSlowHint(active: boolean, afterMs = SLOW_HINT_AFTER_MS): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), afterMs);
    return () => clearTimeout(timer);
  }, [active, afterMs]);

  return active && slow;
}
