import { useEffect, useState } from 'react';

/** Tailwind's `lg` breakpoint: from here up the assistant is docked beside the page; below it, it is a slide-over. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useIsDesktop(): boolean {
  const [matches, setMatches] = useState(() => typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(DESKTOP_QUERY);
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return matches;
}
