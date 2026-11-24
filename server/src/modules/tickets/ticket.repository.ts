export interface Ticket {
  id: string;
  userId: string;
  conversationId: string | null;
  ticketNumber: string;
  summary: string;
  status: 'open';
  createdAt: Date;
}

export interface TicketRepository {
  create(
    userId: string,
    input: { conversationId: string | null; summary: string; ticketNumber: string },
  ): Promise<Ticket>;
}
