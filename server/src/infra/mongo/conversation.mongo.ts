import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;
import { decodeCursor, encodeCursor, type Page } from '../../lib/pagination';
import type { Conversation, ConversationRepository } from '../../modules/chat/conversation.repository';
import { toObjectId } from './ids';

interface ConversationDoc {
  _id: { toString(): string };
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema(
  { userId: { type: String, required: true }, title: { type: String, required: true } },
  { timestamps: true },
);
schema.index({ userId: 1, updatedAt: -1 });

export const ConversationModel: Model<ConversationDoc> =
  (models.Conversation as Model<ConversationDoc>) ?? model<ConversationDoc>('Conversation', schema);

const toConversation = (d: ConversationDoc): Conversation => ({
  id: d._id.toString(),
  userId: d.userId,
  title: d.title,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export class MongoConversationRepository implements ConversationRepository {
  async create(userId: string, title: string): Promise<Conversation> {
    const doc = await ConversationModel.create({ userId, title });
    return toConversation(doc.toObject() as ConversationDoc);
  }

  async findById(userId: string, id: string): Promise<Conversation | null> {
    const oid = toObjectId(id);
    if (!oid) return null;
    const doc = await ConversationModel.findOne({ _id: oid, userId }).lean<ConversationDoc>();
    return doc ? toConversation(doc) : null;
  }

  async listByUser(userId: string, opts: { cursor?: string; limit: number }): Promise<Page<Conversation>> {
    const filter: Record<string, unknown> = { userId };
    const cur = opts.cursor ? decodeCursor(opts.cursor) : null;
    const curOid = cur ? toObjectId(cur.id) : null;
    if (cur && curOid) {
      filter.$or = [
        { updatedAt: { $lt: cur.date } },
        { updatedAt: cur.date, _id: { $lt: curOid } },
      ];
    }
    const docs = await ConversationModel.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(opts.limit + 1)
      .lean<ConversationDoc[]>();
    const items = docs.slice(0, opts.limit).map(toConversation);
    const last = items[items.length - 1];
    const nextCursor = docs.length > opts.limit && last ? encodeCursor(last.updatedAt, last.id) : null;
    return { items, nextCursor };
  }

  async touch(userId: string, id: string): Promise<void> {
    const oid = toObjectId(id);
    if (!oid) return;
    await ConversationModel.updateOne({ _id: oid, userId }, { $set: { updatedAt: new Date() } });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const oid = toObjectId(id);
    if (!oid) return false;
    const res = await ConversationModel.deleteOne({ _id: oid, userId });
    return res.deletedCount === 1;
  }
}
