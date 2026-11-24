import { z } from 'zod';
import type { OrderService } from '../../orders/order.service';
import { defineTool } from './tool.types';

export const createReturnRequestTool = (orders: OrderService) =>
  defineTool({
    name: 'create_return_request',
    description:
      'Create a return request for an order. Only call after the customer confirms they want to return it. Fails if the order is not eligible.',
    statusLabel: 'Starting your return…',
    schema: z.object({ orderNumber: z.string().min(1).max(30), reason: z.string().trim().min(1).max(300) }),
    async run({ orderNumber, reason }, ctx) {
      const res = await orders.createReturnRequest(ctx.userId, orderNumber, reason);
      return res.ok ? { created: true, status: res.request.status } : { created: false, reason: res.reason };
    },
  });
