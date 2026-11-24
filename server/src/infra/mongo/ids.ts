import mongoose from 'mongoose';

/** Converts a string id to an ObjectId, or null when it is not a valid id (so lookups just miss). */
export function toObjectId(id: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const oid = new mongoose.Types.ObjectId(id);
  return String(oid) === id ? oid : null;
}
