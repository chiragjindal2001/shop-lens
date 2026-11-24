import { z } from 'zod';
import type { OrderService } from '../../orders/order.service';
import { defineTool } from './tool.types';

export const cancelOrderTool = (orders: OrderService) =>
  defineTool({
    name: 'cancel_order',
    description:
      'Cancel an order. Only works while the order is placed or packed. Only call after the customer clearly asks to cancel.',
    statusLabel: 'Cancelling your order…',
    schema: z.object({ orderNumber: z.string().min(1).max(30) }),
    async run({ orderNumber }, ctx) {
      const res = await orders.cancel(ctx.userId, orderNumber);
      return res.ok ? { cancelled: true, orderNumber: res.order.orderNumber } : { cancelled: false, reason: res.reason };
    },
  });
