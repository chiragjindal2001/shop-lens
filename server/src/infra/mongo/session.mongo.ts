import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;
import type { Session, SessionRepository } from '../../modules/auth/session.repository';
import { toObjectId } from './ids';

interface SessionDoc {
  _id: { toString(): string };
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

const schema = new Schema({
  userId: { type: String, required: true, index: true },
  refreshTokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
});
// TTL: Mongo removes expired sessions automatically.
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel: Model<SessionDoc> =
  (models.Session as Model<SessionDoc>) ?? model<SessionDoc>('Session', schema);

const toSession = (d: SessionDoc): Session => ({
  id: d._id.toString(),
  userId: d.userId,
  refreshTokenHash: d.refreshTokenHash,
  expiresAt: d.expiresAt,
  revokedAt: d.revokedAt ?? null,
});

export class MongoSessionRepository implements SessionRepository {
  async create(input: { userId: string; refreshTokenHash: string; expiresAt: Date }): Promise<Session> {
    const doc = await SessionModel.create(input);
    return toSession(doc.toObject() as SessionDoc);
  }

  async findById(id: string): Promise<Session | null> {
    const oid = toObjectId(id);
    if (!oid) return null;
    const doc = await SessionModel.findById(oid).lean<SessionDoc>();
    return doc ? toSession(doc) : null;
  }

  async rotate(id: string, expectedHash: string, newHash: string, newExpiresAt: Date): Promise<boolean> {
    const oid = toObjectId(id);
    if (!oid) return false;
    const res = await SessionModel.updateOne(
      { _id: oid, refreshTokenHash: expectedHash, revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { refreshTokenHash: newHash, expiresAt: newExpiresAt } },
    );
    return res.modifiedCount === 1;
  }

  async revoke(id: string): Promise<void> {
    const oid = toObjectId(id);
    if (!oid) return;
    await SessionModel.updateOne({ _id: oid, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
}
