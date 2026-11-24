import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MAX_MESSAGE_LENGTH } from '@shared';
import { Button } from '../../components/ui/Button';

interface Props {
  streaming: boolean;
  onSend(text: string): void;
  onStop(): void;
}

export function Composer({ streaming, onSend, onStop }: Props) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const tooLong = text.length > MAX_MESSAGE_LENGTH;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!trimmed || tooLong || streaming) return;
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
    <form onSubmit={submit} className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={streaming}
            rows={2}
            placeholder="Ask about your orders, returns, shipping…"
            aria-label="Message"
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
          />
          <div className={`mt-0.5 text-right text-xs ${tooLong ? 'text-red-600' : 'text-slate-400'}`}>
            {text.length}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>
        {streaming ? (
          <Button type="button" variant="secondary" onClick={onStop} className="mb-5">
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!trimmed || tooLong} className="mb-5">
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
