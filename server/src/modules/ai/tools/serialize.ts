import type { Order } from '../../orders/order.repository';

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** What the model gets to see about an order. Internal ids and userId are never exposed. */
export function orderView(o: Order) {
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    items: o.items,
    totalInr: o.total,
    placedOn: day(o.placedAt),
    expectedDelivery: day(o.expectedDeliveryAt),
    deliveredOn: day(o.deliveredAt),
  };
}
