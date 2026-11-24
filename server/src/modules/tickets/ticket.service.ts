import { randomInt } from 'node:crypto';
import type { Ticket, TicketRepository } from './ticket.repository';

export class TicketService {
  constructor(private readonly tickets: TicketRepository) {}

  create(userId: string, input: { summary: string; conversationId: string | null }): Promise<Ticket> {
    const ticketNumber = `TKT-${randomInt(100000, 999999)}`;
    return this.tickets.create(userId, { ...input, ticketNumber });
  }
}
