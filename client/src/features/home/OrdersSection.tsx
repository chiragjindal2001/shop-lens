import { memo, useEffect, useState } from 'react';
import type { OrderDto, OrderStatus } from '@shared';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { tip } from '../../lib/tip';
import { formatINR } from './catalog';
import type { useOrders } from './useOrders';

export const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  placed: { label: 'Order placed', tone: 'bg-info-soft text-info' },
  packed: { label: 'Packed', tone: 'bg-info-soft text-info' },
  shipped: { label: 'Shipped', tone: 'bg-warn-soft text-warn' },
  delivered: { label: 'Delivered', tone: 'bg-success-soft text-success' },
  cancelled: { label: 'Cancelled', tone: 'bg-surface-2 text-muted' },
  return_requested: { label: 'Return requested', tone: 'bg-warn-soft text-warn' },
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** One line about where the order is. */
export function orderSummary(o: OrderDto): string {
  switch (o.status) {
    case 'shipped':
      return o.expectedDeliveryAt ? `Arriving ${day(o.expectedDeliveryAt)}` : 'On its way';
    case 'placed':
    case 'packed':
      return o.expectedDeliveryAt ? `Expected ${day(o.expectedDeliveryAt)}` : 'Being prepared';
    case 'delivered':
      return o.deliveredAt ? `Delivered ${day(o.deliveredAt)}` : 'Delivered';
    case 'return_requested':
      return 'Return requested. We will arrange a pickup.';
    case 'cancelled':
      return 'Cancelled. Refund on its way.';
  }
}

interface CardProps {
  order: OrderDto;
  confirming: boolean;
  onAsk(text: string): void;
  onConfirmChange(orderNumber: string | null): void;
}

const OrderCard = memo(function OrderCard({ order, confirming, onAsk, onConfirmChange }: CardProps) {
  const status = STATUS[order.status];
  const canCancel = order.status === 'placed' || order.status === 'packed';
  const canReturn = order.status === 'delivered';
  const items = order.items.map((i) => (i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name)).join(', ');

  return (
    <li className="shadow-card animate-fade-up flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <span className="bg-brand-soft hidden h-12 w-12 shrink-0 place-items-center rounded-xl text-brand sm:grid">
        <Icon name="package" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{order.orderNumber}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${status.tone}`}>{status.label}</span>
        </div>
        <p className="mt-0.5 truncate text-[13.5px]" title={items}>
          {items}
        </p>
        <p className="text-[12.5px] text-muted">
          {orderSummary(order)} · {formatINR(order.total)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {order.status !== 'cancelled' && (
          <Button variant="secondary" size="sm" onClick={() => onAsk(`Where is my order ${order.orderNumber}?`)} {...tip('Ask the assistant where this order is', 'top', 'end')}>
            Track
          </Button>
        )}
        {canReturn && (
          <Button variant="secondary" size="sm" onClick={() => onAsk(`Can I return order ${order.orderNumber}?`)} {...tip('Check whether this order can be returned', 'top', 'end')}>
            Return
          </Button>
        )}
        {canCancel &&
          (confirming ? (
            <Button
              variant="danger"
              size="sm"
              {...tip('Yes, cancel this order now', 'top', 'end')}
              onClick={() => {
                onConfirmChange(null);
                onAsk(`Please cancel order ${order.orderNumber}`);
              }}
            >
              Confirm cancel
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onConfirmChange(order.orderNumber)} {...tip('Cancel this order (asks you to confirm)', 'top', 'end')}>
              Cancel
            </Button>
          ))}
      </div>
    </li>
  );
});

interface Props {
  orders: ReturnType<typeof useOrders>;
  onAsk(text: string): void;
}

export function OrdersSection({ orders, onAsk }: Props) {
  // Cancelling needs a second click. The confirmation resets itself after a few seconds.
  const [confirming, setConfirming] = useState<string | null>(null);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(null), 5000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <section id="orders" aria-labelledby="orders-title" className="scroll-mt-24">
      <div className="mb-4">
        <h2 id="orders-title" className="text-xl font-bold tracking-tight">
          Your recent orders
        </h2>
        <p className="text-sm text-muted">Track, return or cancel with one click. The assistant takes care of it.</p>
      </div>

      {orders.loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-22 rounded-2xl" />
          ))}
        </div>
      ) : orders.error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-danger-soft p-4 text-sm text-danger" role="alert">
          <span>We couldn't load your orders.</span>
          <Button variant="secondary" size="sm" onClick={() => void orders.refresh()}>
            Try again
          </Button>
        </div>
      ) : orders.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">No orders yet. Your orders will show up here.</div>
      ) : (
        <ul className="space-y-3">
          {orders.orders.map((o) => (
            <OrderCard key={o.orderNumber} order={o} confirming={confirming === o.orderNumber} onAsk={onAsk} onConfirmChange={setConfirming} />
          ))}
        </ul>
      )}
    </section>
  );
}
