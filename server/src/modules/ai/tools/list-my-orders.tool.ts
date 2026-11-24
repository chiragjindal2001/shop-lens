import { z } from 'zod';
import type { OrderService } from '../../orders/order.service';
import { defineTool } from './tool.types';
import { orderView } from './serialize';

export const listMyOrdersTool = (orders: OrderService) =>
  defineTool({
    name: 'list_my_orders',
    description: "List the logged-in customer's most recent orders.",
    statusLabel: 'Checking your orders…',
    schema: z.object({ limit: z.number().int().min(1).max(10).optional() }),
    async run({ limit }, ctx) {
      const list = await orders.list(ctx.userId, limit ?? 5);
      return { orders: list.map(orderView) };
    },
  });
