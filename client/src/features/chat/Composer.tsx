import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { MAX_MESSAGE_LENGTH } from '@shared/limits';
import { Icon } from '../../components/ui/icons';
import { tip } from '../../lib/tip';

interface Props {
  streaming: boolean;
  onSend(text: string): void;
  onStop(): void;
  /** Lets the page focus the box (for example from the "Ask the assistant" button). */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

const MAX_HEIGHT = 160;

export function Composer({ streaming, onSend, onStop, textareaRef }: Props) {
  const [text, setText] = useState('');
  const own = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? own;
  const trimmed = text.trim();
  const tooLong = text.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong && !streaming;

  // Grow with the text, up to a cap.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + 'px';
  }, [text, ref]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSend(trimmed);
    setText('');
    ref.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="px-3 pt-1 pb-3">
      <div className="shadow-card flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={streaming}
          rows={1}
          placeholder="Ask about orders, returns, shipping…"
          aria-label="Message"
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14.5px] leading-snug outline-none placeholder:text-muted/70 disabled:opacity-60"
        />
        {streaming ? (
          <button type="button" onClick={onStop} aria-label="Stop" {...tip('Stop generating', 'top', 'end')} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg transition hover:bg-border">
            <Icon name="stop" size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            {...tip('Send message', 'top', 'end')}
            className="bg-brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white transition enabled:hover:brightness-110 disabled:opacity-35"
          >
            <Icon name="send" size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex justify-between px-1.5 text-[11px] text-muted">
        <span>Enter to send · Shift+Enter for a new line</span>
        {text.length > MAX_MESSAGE_LENGTH * 0.8 && (
          <span className={tooLong ? 'font-medium text-danger' : ''}>
            {text.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
    </form>
  );
}
