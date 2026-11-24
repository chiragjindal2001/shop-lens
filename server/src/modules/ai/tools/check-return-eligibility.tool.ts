import { z } from 'zod';
import type { OrderService } from '../../orders/order.service';
import { RETURN_WINDOW_DAYS } from '../../orders/order.service';
import { defineTool } from './tool.types';

export const checkReturnEligibilityTool = (orders: OrderService) =>
  defineTool({
    name: 'check_return_eligibility',
    description: `Check whether an order can be returned (delivered and within the ${RETURN_WINDOW_DAYS}-day return window).`,
    statusLabel: 'Checking return eligibility…',
    schema: z.object({ orderNumber: z.string().min(1).max(30) }),
    async run({ orderNumber }, ctx) {
      return orders.checkReturnEligibility(ctx.userId, orderNumber);
    },
  });
