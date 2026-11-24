import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;
import { DuplicateEmailError } from '../../lib/errors';
import type { User, UserRepository } from '../../modules/auth/user.repository';
import { isDuplicateKeyError } from './errors';
import { toObjectId } from './ids';

interface UserDoc {
  _id: { toString(): string };
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UserModel: Model<UserDoc> = (models.User as Model<UserDoc>) ?? model<UserDoc>('User', schema);

const toUser = (d: UserDoc): User => ({
  id: d._id.toString(),
  name: d.name,
  email: d.email,
  passwordHash: d.passwordHash,
  createdAt: d.createdAt,
});

export class MongoUserRepository implements UserRepository {
  async create(input: { name: string; email: string; passwordHash: string }): Promise<User> {
    try {
      const doc = await UserModel.create(input);
      return toUser(doc.toObject() as UserDoc);
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new DuplicateEmailError();
      throw err;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const oid = toObjectId(id);
    if (!oid) return null;
    const doc = await UserModel.findById(oid).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  }
}
