import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;
import type {
  ReturnRequest,
  ReturnRequestRepository,
} from '../../modules/orders/return-request.repository';

interface ReturnDoc {
  _id: { toString(): string };
  userId: string;
  orderId: string;
  reason: string;
  status: 'requested';
  createdAt: Date;
}

const schema = new Schema(
  {
    userId: { type: String, required: true },
    orderId: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: 'requested' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ userId: 1, orderId: 1 });

export const ReturnRequestModel: Model<ReturnDoc> =
  (models.ReturnRequest as Model<ReturnDoc>) ?? model<ReturnDoc>('ReturnRequest', schema);

const toReturn = (d: ReturnDoc): ReturnRequest => ({
  id: d._id.toString(),
  userId: d.userId,
  orderId: d.orderId,
  reason: d.reason,
  status: d.status,
  createdAt: d.createdAt,
});

export class MongoReturnRequestRepository implements ReturnRequestRepository {
  async create(userId: string, input: { orderId: string; reason: string }): Promise<ReturnRequest> {
    const doc = await ReturnRequestModel.create({ ...input, userId });
    return toReturn(doc.toObject() as ReturnDoc);
  }

  async findByOrderId(userId: string, orderId: string): Promise<ReturnRequest | null> {
    const doc = await ReturnRequestModel.findOne({ userId, orderId }).lean<ReturnDoc>();
    return doc ? toReturn(doc) : null;
  }
}
