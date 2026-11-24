import { z } from 'zod';
import type { OrderService } from '../../orders/order.service';
import { defineTool } from './tool.types';
import { orderView } from './serialize';

export const getOrderStatusTool = (orders: OrderService) =>
  defineTool({
    name: 'get_order_status',
    description: 'Get the status, items and expected delivery of one of the customer\'s orders by order number (e.g. SE1042).',
    statusLabel: 'Looking up your order…',
    schema: z.object({ orderNumber: z.string().min(1).max(30) }),
    async run({ orderNumber }, ctx) {
      return { order: orderView(await orders.get(ctx.userId, orderNumber)) }; // NotFoundError → "not found"
    },
  });
