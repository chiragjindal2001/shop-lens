import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConversationDto } from '@shared';
import { deleteConversation, fetchHistory } from './api';

export function useConversations() {
  const [items, setItems] = useState<ConversationDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);

  /** Reloads the first page (used after a chat turn finishes). */
  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    try {
      const page = await fetchHistory();
      if (gen !== generation.current) return;
      setItems(page.conversations);
      setNextCursor(page.nextCursor);
      setError(false);
    } catch {
      if (gen === generation.current) setError(true);
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const page = await fetchHistory(nextCursor);
    setItems((cur) => [...cur, ...page.conversations.filter((c) => !cur.some((x) => x.id === c.id))]);
    setNextCursor(page.nextCursor);
  }, [nextCursor]);

  const remove = useCallback(async (id: string) => {
    await deleteConversation(id);
    setItems((cur) => cur.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, hasMore: nextCursor !== null, refresh, loadMore, remove };
}
