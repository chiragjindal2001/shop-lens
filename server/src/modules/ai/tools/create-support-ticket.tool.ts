import { z } from 'zod';
import type { TicketService } from '../../tickets/ticket.service';
import { defineTool } from './tool.types';

export const createSupportTicketTool = (tickets: TicketService) =>
  defineTool({
    name: 'create_support_ticket',
    description:
      'Escalate to a human agent by creating a support ticket. Use when the customer asks for a human, reports money deducted, a damaged item, or when you cannot answer.',
    statusLabel: 'Creating a support ticket…',
    schema: z.object({ summary: z.string().trim().min(1).max(500) }),
    async run({ summary }, ctx) {
      const t = await tickets.create(ctx.userId, { summary, conversationId: ctx.conversationId });
      return { ticketNumber: t.ticketNumber, status: t.status };
    },
  });
