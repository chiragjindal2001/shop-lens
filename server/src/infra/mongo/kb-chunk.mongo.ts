import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

export interface KbChunkDoc {
  text: string;
  source: string;
  section: string;
  embedding: number[];
}

const schema = new Schema(
  {
    text: { type: String, required: true },
    source: { type: String, required: true },
    section: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { collection: 'kbChunks' },
);

export const KbChunkModel: Model<KbChunkDoc> =
  (models.KbChunk as Model<KbChunkDoc>) ?? model<KbChunkDoc>('KbChunk', schema);
