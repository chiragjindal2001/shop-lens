import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;
import type { Ticket, TicketRepository } from '../../modules/tickets/ticket.repository';

interface TicketDoc {
  _id: { toString(): string };
  userId: string;
  conversationId: string | null;
  ticketNumber: string;
  summary: string;
  status: 'open';
  createdAt: Date;
}

const schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    conversationId: { type: String, default: null },
    ticketNumber: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    status: { type: String, default: 'open' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const TicketModel: Model<TicketDoc> =
  (models.Ticket as Model<TicketDoc>) ?? model<TicketDoc>('Ticket', schema);

const toTicket = (d: TicketDoc): Ticket => ({
  id: d._id.toString(),
  userId: d.userId,
  conversationId: d.conversationId ?? null,
  ticketNumber: d.ticketNumber,
  summary: d.summary,
  status: d.status,
  createdAt: d.createdAt,
});

export class MongoTicketRepository implements TicketRepository {
  async create(
    userId: string,
    input: { conversationId: string | null; summary: string; ticketNumber: string },
  ): Promise<Ticket> {
    const doc = await TicketModel.create({ ...input, userId });
    return toTicket(doc.toObject() as TicketDoc);
  }
}
