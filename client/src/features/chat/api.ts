import type { ConversationResponse, HistoryResponse, SseEvent } from '@shared';
import { API_BASE, ApiError, getAccessToken, http, refreshSession } from '../../lib/http';
import { createSseParser } from '../../lib/sse-parser';

export const fetchHistory = async (cursor?: string) =>
  (await http.get<HistoryResponse>('/chat/history', { params: { cursor, limit: 20 } })).data;

export const fetchConversation = async (id: string) =>
  (await http.get<ConversationResponse>(`/chat/history/${id}`)).data;

export const deleteConversation = async (id: string) => {
  await http.delete(`/chat/history/${id}`);
};

interface StreamArgs {
  conversationId?: string;
  message: string;
  idempotencyKey: string;
  signal: AbortSignal;
  onEvent: (e: SseEvent) => void;
}

/**
 * POST /chat/send and read the SSE stream. Uses fetch + ReadableStream (EventSource can't POST or send
 * an Authorization header). On a 401 it refreshes the session once and retries.
 */
export async function streamMessage({ conversationId, message, idempotencyKey, signal, onEvent }: StreamArgs) {
  const post = () =>
    fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ conversationId, message, idempotencyKey }),
    });

  let res = await post();
  if (res.status === 401) {
    await refreshSession();
    res = await post();
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? 'Request failed', res.status, body?.error?.code);
  }

  const parser = createSseParser(onEvent);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }
}
