import { useTheme } from './useTheme';
import { tip, type TipAlign } from '../lib/tip';
import { IconButton } from './ui/Button';
import { Icon } from './ui/icons';

const ICONS = { light: 'sun', dark: 'moon', system: 'monitor' } as const;
const NEXT = { light: 'dark', dark: 'system', system: 'light' } as const;
const NAME = { light: 'Light', dark: 'Dark', system: 'System' } as const;

/** One button that cycles light, dark and system. */
export function ThemeToggle({ tipAlign = 'center' }: { tipAlign?: TipAlign }) {
  const { theme, cycle } = useTheme();
  return (
    <IconButton onClick={cycle} aria-label={`Theme: ${theme}. Click to change`} {...tip(`${NAME[theme]} theme. Click for ${NEXT[theme]}`, 'bottom', tipAlign)}>
      <Icon name={ICONS[theme]} />
    </IconButton>
  );
}
