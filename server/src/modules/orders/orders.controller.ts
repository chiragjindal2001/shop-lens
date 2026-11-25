import type { Request, Response } from 'express';
import type { OrderDto, OrdersResponse } from '@shared';
import type { Order } from './order.repository';
import type { OrderService } from './order.service';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const toOrderDto = (o: Order): OrderDto => ({
  orderNumber: o.orderNumber,
  status: o.status,
  items: o.items,
  total: o.total,
  placedAt: o.placedAt.toISOString(),
  expectedDeliveryAt: iso(o.expectedDeliveryAt),
  deliveredAt: iso(o.deliveredAt),
});

export class OrdersController {
  constructor(private readonly orders: OrderService) {}

  /** The logged-in user's most recent orders (read-only; the assistant is what acts on them). */
  list = async (req: Request, res: Response) => {
    const orders = await this.orders.list(req.user!.id, 10);
    const body: OrdersResponse = { orders: orders.map(toOrderDto) };
    res.json(body);
  };
}
