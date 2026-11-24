import { describe, expect, it } from 'vitest';
import type { ReturnRequestRepository } from '../../src/modules/orders/return-request.repository';
import type { TicketRepository } from '../../src/modules/tickets/ticket.repository';

export function returnRequestRepositoryContract(make: () => ReturnRequestRepository) {
  describe('ReturnRequestRepository contract', () => {
    it('creates and finds by order, scoped by user', async () => {
      const repo = make();
      const r = await repo.create('u1', { orderId: 'o1', reason: 'defective' });
      expect(r.status).toBe('requested');
      expect((await repo.findByOrderId('u1', 'o1'))!.id).toBe(r.id);
      expect(await repo.findByOrderId('u2', 'o1')).toBeNull();
    });
  });
}

export function ticketRepositoryContract(make: () => TicketRepository) {
  describe('TicketRepository contract', () => {
    it('creates an open ticket with its number', async () => {
      const t = await make().create('u1', { conversationId: 'c1', summary: 'help', ticketNumber: 'TKT-123456' });
      expect(t).toMatchObject({ userId: 'u1', status: 'open', ticketNumber: 'TKT-123456', conversationId: 'c1' });
    });
  });
}
