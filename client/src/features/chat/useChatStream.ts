import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageDto, SseEvent } from '@shared';
import { toApiError } from '../../lib/http';
import { fetchConversation, streamMessage } from './api';

export interface UiMessage extends MessageDto {
  /** Present while a tool runs for this message ("Checking your order…"). */
  toolLabel?: string;
  streaming?: boolean;
}

interface Options {
  /** Called when a brand-new conversation gets its id (to update the URL). */
  onConversationCreated(id: string): void;
  /** Called after a turn finishes (sidebar refresh). */
  onTurnFinished(): void;
  onNotFound(): void;
}

const GENERIC_ERROR = 'Something went wrong while answering. Please try again.';

export function useChatStream({ onConversationCreated, onTurnFinished, onNotFound }: Options) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sendError, setSendError] = useState<{ message: string; text: string; key: string } | null>(null);

  const conversationId = useRef<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const cb = useRef({ onConversationCreated, onTurnFinished, onNotFound });
  cb.current = { onConversationCreated, onTurnFinished, onNotFound };

  const patchLast = (fn: (m: UiMessage) => UiMessage) =>
    setMessages((cur) => (cur.length ? [...cur.slice(0, -1), fn(cur[cur.length - 1]!)] : cur));

  /** Syncs with the URL: loads history for an id, or resets for "new chat". No-op if already active. */
  const open = useCallback(async (id: string | undefined) => {
    if (id === conversationId.current) return;
    abort.current?.abort();
    conversationId.current = id;
    setSendError(null);
    setStreaming(false);
    if (!id) return setMessages([]);
    setLoadingConversation(true);
    try {
      const data = await fetchConversation(id);
      if (conversationId.current === id) setMessages(data.messages);
    } catch (e) {
      if (toApiError(e).status === 404) cb.current.onNotFound();
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  const run = useCallback(async (text: string, key: string, addUserMessage: boolean) => {
    const now = new Date().toISOString();
    setSendError(null);
    setStreaming(true);
    const ctrl = new AbortController();
    abort.current = ctrl;

    setMessages((cur) => [
      ...cur,
      ...(addUserMessage
        ? [{ id: `local-user-${key}`, conversationId: conversationId.current ?? '', role: 'user' as const, content: text, toolCalls: [], sources: [], status: 'complete' as const, idempotencyKey: key, createdAt: now }]
        : []),
      { id: `local-assistant-${key}`, conversationId: conversationId.current ?? '', role: 'assistant', content: '', toolCalls: [], sources: [], status: 'partial', createdAt: now, streaming: true },
    ]);

    const onEvent = (e: SseEvent) => {
      switch (e.event) {
        case 'meta':
          if (!conversationId.current) {
            conversationId.current = e.data.conversationId;
            cb.current.onConversationCreated(e.data.conversationId);
          }
          patchLast((m) => ({ ...m, id: e.data.messageId, conversationId: e.data.conversationId }));
          break;
        case 'tool':
          patchLast((m) => ({ ...m, toolLabel: e.data.label }));
          break;
        case 'token':
          patchLast((m) => ({ ...m, content: m.content + e.data.text, toolLabel: undefined }));
          break;
        case 'sources':
          patchLast((m) => ({ ...m, sources: e.data.sources }));
          break;
        case 'usage': // sent by the server in development mode only
          patchLast((m) => ({ ...m, usage: e.data }));
          break;
        case 'done':
          patchLast((m) => ({ ...m, status: 'complete', streaming: false, toolLabel: undefined }));
          break;
        case 'error':
          patchLast((m) => ({ ...m, status: m.content ? 'partial' : 'error', streaming: false, toolLabel: undefined }));
          break;
      }
    };

    try {
      await streamMessage({ conversationId: conversationId.current, message: text, idempotencyKey: key, signal: ctrl.signal, onEvent });
    } catch (e) {
      if (ctrl.signal.aborted) {
        // Stop pressed (or navigated away): the server keeps what was generated as a partial reply.
        patchLast((m) => ({ ...m, status: m.content ? 'partial' : 'error', streaming: false, toolLabel: undefined }));
      } else {
        // Failed before/while opening the stream: drop the empty placeholder and offer a retry.
        setMessages((cur) => cur.filter((m) => m.id !== `local-assistant-${key}` || m.content));
        patchLast((m) => (m.role === 'assistant' ? { ...m, status: 'partial', streaming: false } : m));
        setSendError({ message: toApiError(e).message || GENERIC_ERROR, text, key });
      }
    } finally {
      setStreaming(false);
      if (abort.current === ctrl) abort.current = null;
      cb.current.onTurnFinished();
    }
  }, []);

  const send = useCallback((text: string) => run(text, crypto.randomUUID(), true), [run]);

  /** Retry after a failed turn: same idempotency key, so the server never double-saves the question. */
  const retrySendError = useCallback(() => {
    if (!sendError) return;
    setMessages((cur) => cur.filter((m) => m.id !== `local-user-${sendError.key}`));
    void run(sendError.text, sendError.key, true);
  }, [run, sendError]);

  const retryMessage = useCallback(
    (assistantId: string) => {
      const idx = messages.findIndex((m) => m.id === assistantId);
      const user = idx > 0 ? messages[idx - 1] : undefined;
      if (!user || user.role !== 'user') return;
      setMessages((cur) => cur.filter((m) => m.id !== assistantId));
      void run(user.content, user.idempotencyKey ?? crypto.randomUUID(), false);
    },
    [messages, run],
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  useEffect(() => () => abort.current?.abort(), []);

  return { messages, streaming, loadingConversation, sendError, open, send, stop, retrySendError, retryMessage };
}
