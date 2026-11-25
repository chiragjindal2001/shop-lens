import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProductDto, ProductsResponse } from '@shared';
import { http } from '../../lib/http';

/** The catalog comes from the server, the same data the assistant answers product questions from. */
export function useProducts() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ProductsResponse>('/products');
      setProducts(data.products);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(() => ({ products, loading, error, reload: load }), [products, loading, error, load]);
}
