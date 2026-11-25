import { Icon } from '../../components/ui/icons';
import { tip } from '../../lib/tip';
import type { SpeechInput } from './useSpeechInput';

interface Props {
  speech: SpeechInput;
  disabled?: boolean;
  className?: string;
}

/** Tap to speak, tap again to stop. Renders nothing in browsers that cannot recognize speech. */
export function MicButton({ speech, disabled, className = '' }: Props) {
  if (!speech.supported) return null;
  const label = speech.listening ? 'Stop listening' : 'Speak your question';
  return (
    <button
      type="button"
      onClick={speech.toggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={speech.listening}
      {...tip(label, 'top', 'end')}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition disabled:opacity-35 ${
        speech.listening ? 'animate-pulse bg-danger text-white' : 'text-muted hover:bg-surface-2 hover:text-fg'
      } ${className}`}
    >
      <Icon name="mic" size={18} />
    </button>
  );
}
