import type { ReactNode, SVGProps } from 'react';

/** Small inline icon set (24px, stroke). Inline SVG keeps the bundle light: no icon library. */
const PATHS: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M12 19V5M5 12l7-7 7 7" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  trash: <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  sparkles: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 3v4M17 5h4" />,
  package: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
  undo: <path d="M3 7v6h6M3 13a9 9 0 1 0 3-6.7" />,
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  headset: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2" y="14" width="5" height="6" rx="2" />
      <rect x="17" y="14" width="5" height="6" rx="2" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  arrowDown: <path d="M12 5v14M19 12l-7 7-7-7" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: <path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.6A17 17 0 0 0 2 12s4 6 10 6c1.5 0 2.9-.4 4.1-1" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="7" rx="1.5" />
      <rect x="17" y="14" width="4" height="7" rx="1.5" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 11v2M7 12h5" />
    </>
  ),
  watch: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="3" />
      <path d="M9 6l.6-3h4.8l.6 3M9 18l.6 3h4.8l.6-3M12 9.5V12l1.5 1" />
    </>
  ),
  mouse: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="6" />
      <path d="M12 7v4" />
    </>
  ),
  cable: <path d="M9 3v4M15 3v4M7 7h10v3a5 5 0 0 1-10 0V7zM12 15v6" />,
  speaker: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <circle cx="12" cy="15" r="3.2" />
      <circle cx="12" cy="7" r="1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  alert: <path d="M12 3l10 18H2zM12 10v4M12 17.5v.01" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.5-3.5M4 4v4h4M4 13a8 8 0 0 0 14.5 3.5M20 20v-4h-4" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, className, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
