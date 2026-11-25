import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OrderDto, OrdersResponse } from '@shared';
import { http } from '../../lib/http';

export function useOrders() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);

  /** Reloads the list. Called again after every assistant turn, since it may have cancelled or returned an order. */
  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    try {
      const { data } = await http.get<OrdersResponse>('/orders');
      if (gen !== generation.current) return;
      setOrders(data.orders);
      setError(false);
    } catch {
      if (gen === generation.current) setError(true);
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(() => ({ orders, loading, error, refresh }), [orders, loading, error, refresh]);
}
