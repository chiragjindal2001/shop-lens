import { act, render, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hero is stubbed with a render counter: it only renders again if Storefront itself re-renders.
const heroRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('./Hero', () => ({
  Hero: () => {
    heroRenders.count++;
    return null;
  },
}));

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(async (url: string) => ({ data: url === '/orders' ? { orders: [] } : { products: [] } })) } }));

import { changesOrders, ORDER_CHANGING_TOOLS } from './orderTools';
import { Storefront } from './Storefront';
import { useOrders } from './useOrders';
import { useProducts } from './useProducts';

const orders = { orders: [], loading: false, error: false, refresh: vi.fn() };
const catalog = { products: [], loading: false, error: false, reload: vi.fn() };
const onAsk = vi.fn();
const onLogout = vi.fn();

/** A stand-in for HomePage: re-renders on demand (like every streamed frame does) with identical storefront props. */
function Harness() {
  const [, setFrame] = useState(0);
  return (
    <>
      <button onClick={() => setFrame((f) => f + 1)}>frame</button>
      <Storefront userName="Demo User" firstName="Demo" orders={orders} catalog={catalog} onAsk={onAsk} onLogout={onLogout} />
    </>
  );
}

describe('Storefront', () => {
  beforeEach(() => {
    heroRenders.count = 0;
  });

  it('is not re-rendered when only the assistant changes (e.g. 60 streamed frames)', () => {
    const { getByText } = render(<Harness />);
    expect(heroRenders.count).toBe(1); // the first render

    for (let i = 0; i < 60; i++) act(() => getByText('frame').click());
    expect(heroRenders.count).toBe(1); // still 1: 60 parent re-renders, zero storefront renders
  });

  it('does re-render when its data really changes', () => {
    const { rerender } = render(<Storefront userName="A" firstName="A" orders={orders} catalog={catalog} onAsk={onAsk} onLogout={onLogout} />);
    expect(heroRenders.count).toBe(1);
    rerender(<Storefront userName="A" firstName="A" orders={{ ...orders, loading: true }} catalog={catalog} onAsk={onAsk} onLogout={onLogout} />);
    expect(heroRenders.count).toBe(2);
  });
});

describe('data hooks keep a stable identity until their data changes', () => {
  it('useOrders returns the same object across unrelated re-renders', async () => {
    const { result, rerender } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const settled = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(settled);
  });

  it('useProducts returns the same object across unrelated re-renders', async () => {
    const { result, rerender } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const settled = result.current;
    rerender();
    expect(result.current).toBe(settled);
  });
});

describe('when the orders list is reloaded', () => {
  it('only after a tool that changes an order', () => {
    expect([...ORDER_CHANGING_TOOLS].sort()).toEqual(['cancel_order', 'create_return_request']);
    expect(changesOrders(['cancel_order'])).toBe(true);
    expect(changesOrders(['search_policies', 'create_return_request'])).toBe(true);
    expect(changesOrders(['get_order_status', 'list_my_orders', 'check_return_eligibility', 'search_products', 'search_policies', 'create_support_ticket'])).toBe(false);
    expect(changesOrders([])).toBe(false);
  });
});
