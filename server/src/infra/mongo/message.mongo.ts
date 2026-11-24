import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;
import type { MessageRole, MessageStatus, SourceRef, ToolCallRecord, UsageDto } from '@shared';
import type {
  Message,
  MessagePatch,
  MessageRepository,
  NewMessage,
} from '../../modules/chat/message.repository';
import { isDuplicateKeyError } from './errors';
import { toObjectId } from './ids';

interface MessageDoc {
  _id: { toString(): string };
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  toolCalls: ToolCallRecord[];
  sources: SourceRef[];
  status: MessageStatus;
  idempotencyKey?: string | null;
  usage?: UsageDto | null;
  replyTo?: string | null;
  createdAt: Date;
}

const schema = new Schema(
  {
    conversationId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, default: '' },
    toolCalls: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: [Schema.Types.Mixed], default: [] },
    status: { type: String, enum: ['complete', 'partial', 'error'], default: 'complete' },
    idempotencyKey: { type: String },
    usage: { type: Schema.Types.Mixed },
    replyTo: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ conversationId: 1, createdAt: 1 });
// Unique per user, but only for messages that carry a key (assistant messages have none).
schema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
schema.index({ userId: 1, replyTo: 1 });

export const MessageModel: Model<MessageDoc> =
  (models.Message as Model<MessageDoc>) ?? model<MessageDoc>('Message', schema);

const toMessage = (d: MessageDoc): Message => ({
  id: d._id.toString(),
  conversationId: d.conversationId,
  userId: d.userId,
  role: d.role,
  content: d.content,
  toolCalls: d.toolCalls ?? [],
  sources: d.sources ?? [],
  status: d.status,
  idempotencyKey: d.idempotencyKey ?? null,
  usage: d.usage ?? null,
  replyTo: d.replyTo ?? null,
  createdAt: d.createdAt,
});

export class MongoMessageRepository implements MessageRepository {
  async create(userId: string, input: NewMessage): Promise<Message> {
    const doc = await MessageModel.create({ ...input, userId });
    return toMessage(doc.toObject() as MessageDoc);
  }

  async insertIfAbsent(userId: string, input: NewMessage & { idempotencyKey: string }) {
    try {
      return { message: await this.create(userId, input), created: true };
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      const existing = await this.findByIdempotencyKey(userId, input.idempotencyKey);
      if (!existing) throw err;
      return { message: existing, created: false };
    }
  }

  async findByIdempotencyKey(userId: string, key: string): Promise<Message | null> {
    const doc = await MessageModel.findOne({ userId, idempotencyKey: key }).lean<MessageDoc>();
    return doc ? toMessage(doc) : null;
  }

  async findReplyTo(userId: string, userMessageId: string): Promise<Message | null> {
    const doc = await MessageModel.findOne({ userId, replyTo: userMessageId }).lean<MessageDoc>();
    return doc ? toMessage(doc) : null;
  }

  async update(userId: string, id: string, patch: MessagePatch): Promise<void> {
    const oid = toObjectId(id);
    if (!oid) return;
    await MessageModel.updateOne({ _id: oid, userId }, { $set: patch });
  }

  async deleteById(userId: string, id: string): Promise<void> {
    const oid = toObjectId(id);
    if (!oid) return;
    await MessageModel.deleteOne({ _id: oid, userId });
  }

  async listByConversation(userId: string, conversationId: string): Promise<Message[]> {
    const docs = await MessageModel.find({ userId, conversationId })
      .sort({ createdAt: 1, _id: 1 })
      .lean<MessageDoc[]>();
    return docs.map(toMessage);
  }

  async listRecent(userId: string, conversationId: string, limit: number): Promise<Message[]> {
    const docs = await MessageModel.find({ userId, conversationId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean<MessageDoc[]>();
    return docs.reverse().map(toMessage);
  }
}
