import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OrderDto } from '@shared';
import { OrdersSection, orderSummary } from './OrdersSection';

const order = (over: Partial<OrderDto>): OrderDto => ({
  orderNumber: 'SE1000',
  status: 'placed',
  items: [{ name: 'Test Item', quantity: 1, price: 100 }],
  total: 100,
  placedAt: '2026-11-20T10:00:00.000Z',
  expectedDeliveryAt: '2026-11-28T10:00:00.000Z',
  deliveredAt: null,
  ...over,
});

const state = (orders: OrderDto[], over = {}) => ({ orders, loading: false, error: false, refresh: vi.fn(), ...over });

afterEach(() => vi.useRealTimers());

describe('OrdersSection', () => {
  it('shows each order with its status and offers only the actions that make sense', () => {
    render(
      <OrdersSection
        onAsk={vi.fn()}
        orders={state([
          order({ orderNumber: 'SE1040', status: 'packed' }),
          order({ orderNumber: 'SE1041', status: 'shipped' }),
          order({ orderNumber: 'SE1042', status: 'delivered', deliveredAt: '2026-11-21T10:00:00.000Z' }),
          order({ orderNumber: 'SE1043', status: 'cancelled' }),
        ])}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    const actions = (i: number) => within(rows[i]!).queryAllByRole('button').map((b) => b.textContent);
    expect(actions(0)).toEqual(['Track', 'Cancel']); // packed: track or cancel
    expect(actions(1)).toEqual(['Track']); // shipped: cannot be cancelled
    expect(actions(2)).toEqual(['Track', 'Return']); // delivered: return allowed
    expect(actions(3)).toEqual([]); // cancelled: nothing to do
    expect(within(rows[3]!).getByText('Cancelled')).toBeInTheDocument();
  });

  it('Track and Return ask the assistant, and send nothing else', async () => {
    const onAsk = vi.fn();
    render(<OrdersSection onAsk={onAsk} orders={state([order({ orderNumber: 'SE1042', status: 'delivered', deliveredAt: '2026-11-21T10:00:00.000Z' })])} />);
    await userEvent.click(screen.getByRole('button', { name: 'Track' }));
    await userEvent.click(screen.getByRole('button', { name: 'Return' }));
    expect(onAsk.mock.calls).toEqual([['Where is my order SE1042?'], ['Can I return order SE1042?']]);
  });

  it('cancelling needs a second, explicit click', async () => {
    const onAsk = vi.fn();
    render(<OrdersSection onAsk={onAsk} orders={state([order({ orderNumber: 'SE1040', status: 'packed' })])} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onAsk).not.toHaveBeenCalled(); // first click only arms the confirmation

    await userEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));
    expect(onAsk).toHaveBeenCalledExactlyOnceWith('Please cancel order SE1040');
    expect(screen.queryByRole('button', { name: 'Confirm cancel' })).not.toBeInTheDocument();
  });

  it('the cancel confirmation disarms itself after a few seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<OrdersSection onAsk={vi.fn()} orders={state([order({ status: 'packed' })])} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Confirm cancel' })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(5100));
    expect(screen.queryByRole('button', { name: 'Confirm cancel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('handles loading, error (with retry) and empty states', async () => {
    const { rerender } = render(<OrdersSection onAsk={vi.fn()} orders={state([], { loading: true })} />);
    expect(screen.getByText('Your recent orders').closest('section')).toHaveAttribute('id', 'orders');
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();

    const refresh = vi.fn();
    rerender(<OrdersSection onAsk={vi.fn()} orders={state([], { error: true, refresh })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalled();

    rerender(<OrdersSection onAsk={vi.fn()} orders={state([])} />);
    expect(screen.getByText(/No orders yet/)).toBeInTheDocument();
  });
});

describe('orderSummary', () => {
  it.each([
    [{ status: 'shipped' as const }, /^Arriving \d+ \w+$/],
    [{ status: 'packed' as const }, /^Expected \d+ \w+$/],
    [{ status: 'delivered' as const, deliveredAt: '2026-11-20T10:00:00.000Z' }, /^Delivered 20 Nov$/],
    [{ status: 'cancelled' as const }, /^Cancelled/],
    [{ status: 'return_requested' as const }, /^Return requested/],
    [{ status: 'shipped' as const, expectedDeliveryAt: null }, /^On its way$/],
  ])('%j', (over, expected) => {
    expect(orderSummary(order(over))).toMatch(expected);
  });
});
