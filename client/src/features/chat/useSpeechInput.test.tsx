import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Composer } from './Composer';
import { useSpeechInput } from './useSpeechInput';

class FakeRecognition {
  static last: FakeRecognition | undefined;
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
  say(...parts: string[]) {
    this.onresult?.({ results: parts.map((transcript) => [{ transcript }]) });
  }
}

beforeEach(() => {
  FakeRecognition.last = undefined;
  (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = FakeRecognition;
});
afterEach(() => {
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

describe('useSpeechInput', () => {
  it('reports when the browser cannot recognize speech', () => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    const { result } = renderHook(() => useSpeechInput('', vi.fn()));
    expect(result.current.supported).toBe(false);
  });

  it('listens, shows interim words as they come, and appends them to what was already typed', () => {
    const onText = vi.fn();
    const { result } = renderHook(() => useSpeechInput('Where is ', onText));
    act(() => result.current.toggle());
    expect(result.current.listening).toBe(true);
    expect(FakeRecognition.last).toMatchObject({ interimResults: true, continuous: false, lang: 'en-IN' });

    act(() => FakeRecognition.last!.say('my'));
    act(() => FakeRecognition.last!.say('my order'));
    expect(onText).toHaveBeenLastCalledWith('Where is my order');
  });

  it('stops when toggled again', () => {
    const { result } = renderHook(() => useSpeechInput('', vi.fn()));
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.listening).toBe(false);
  });

  it('explains a blocked microphone', () => {
    const { result } = renderHook(() => useSpeechInput('', vi.fn()));
    act(() => result.current.toggle());
    act(() => FakeRecognition.last!.onerror!({ error: 'not-allowed' }));
    expect(result.current.error).toMatch(/blocked/i);
  });

  it('stops listening when the component goes away', () => {
    const { result, unmount } = renderHook(() => useSpeechInput('', vi.fn()));
    act(() => result.current.toggle());
    const r = FakeRecognition.last!;
    unmount();
    expect(r.abort).toHaveBeenCalled();
  });
});

describe('Composer with voice input', () => {
  it('puts the spoken words in the message box; nothing is sent until the user presses Send', () => {
    const onSend = vi.fn();
    render(<Composer streaming={false} onSend={onSend} onStop={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Speak your question' }));
    act(() => FakeRecognition.last!.say('is shipping free'));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('is shipping free');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stop listening' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no mic button in a browser without speech recognition', () => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    render(<Composer streaming={false} onSend={vi.fn()} onStop={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /speak/i })).not.toBeInTheDocument();
  });
});
