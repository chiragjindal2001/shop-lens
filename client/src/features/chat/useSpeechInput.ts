import { useCallback, useEffect, useRef, useState } from 'react';

/** The parts of the browser's SpeechRecognition that we use (TypeScript has no built-in types for it). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser settings to speak.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in your browser settings to speak.',
  'no-speech': "We didn't hear anything. Tap the mic and try again.",
  'audio-capture': 'No microphone was found.',
  network: 'Voice input needs an internet connection.',
};

export interface SpeechInput {
  /** False in browsers without speech recognition (e.g. Firefox): the mic button should then not be shown. */
  supported: boolean;
  listening: boolean;
  error: string | null;
  toggle(): void;
}

/**
 * Speech to text with the browser's own recognizer. `base` is what is already in the field; the spoken words are
 * appended to it, and shown as they are recognized. `onText` receives the whole new text of the field.
 */
export function useSpeechInput(base: string, onText: (text: string) => void, lang = 'en-IN'): SpeechInput {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const baseRef = useRef(base);
  const onTextRef = useRef(onText);
  baseRef.current = base;
  onTextRef.current = onText;
  const supported = typeof window !== 'undefined' && getCtor() !== undefined;

  useEffect(() => () => recognition.current?.abort(), []);

  const toggle = useCallback(() => {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    const prefix = baseRef.current.trim() ? baseRef.current.trimEnd() + ' ' : '';
    r.onresult = (e) => {
      const spoken = Array.from(e.results, (result) => result[0]?.transcript ?? '').join('').trim();
      onTextRef.current(prefix + spoken);
    };
    r.onerror = (e) => setError(MESSAGES[e.error] ?? (e.error === 'aborted' ? null : 'Voice input stopped. Please try again.'));
    r.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    setError(null);
    recognition.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      recognition.current = null;
      setError('Voice input could not start. Please try again.');
    }
  }, [lang]);

  return { supported, listening, error, toggle };
}
