import mongoose from 'mongoose';
import { logger } from '../../lib/logger';
import type { KbChunk, KnowledgeHit, KnowledgeStore } from '../../modules/knowledge/knowledge-store';
import { rankByCosine } from '../memory-knowledge-store';
import { KbChunkModel } from './kb-chunk.mongo';

export const VECTOR_INDEX = 'kb_vector_index';
const NUM_CANDIDATES = 50;

/**
 * Atlas Vector Search ($vectorSearch) with a built-in fallback: if the deployment has no vector search
 * (plain mongod, mongodb-memory-server, index still building) it ranks the stored chunks in memory.
 * Both paths return cosine similarity, so callers see the same output either way.
 */
export class AtlasKnowledgeStore implements KnowledgeStore {
  private cache: KbChunk[] | null = null;
  private warned = false;

  constructor(private readonly dimensions = 1536) {}

  count(): Promise<number> {
    return KbChunkModel.countDocuments();
  }

  async replaceAll(chunks: KbChunk[]): Promise<void> {
    await KbChunkModel.deleteMany({});
    if (chunks.length) await KbChunkModel.insertMany(chunks);
    this.cache = null;
  }

  async search(queryEmbedding: number[], opts: { limit: number }): Promise<KnowledgeHit[]> {
    try {
      const rows = await KbChunkModel.aggregate<{ text: string; source: string; section: string; score: number }>([
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: NUM_CANDIDATES,
            limit: opts.limit,
          },
        },
        { $project: { _id: 0, text: 1, source: 1, section: 1, score: { $meta: 'vectorSearchScore' } } },
      ]);
      // With the data loaded, a ready index always returns the top-N; zero rows means it isn't queryable yet.
      if (rows.length > 0) {
        // Atlas normalises cosine to (1 + cos) / 2. Convert back to plain cosine.
        return rows.map((r) => ({ ...r, score: 2 * r.score - 1 }));
      }
    } catch (err) {
      if (!this.warned) {
        this.warned = true;
        logger.warn({ err: String(err) }, '$vectorSearch unavailable, falling back to in-memory cosine similarity');
      }
    }
    return rankByCosine(await this.loadAll(), queryEmbedding, opts.limit);
  }

  /**
   * Creates the vector index if missing. The search sidecar (mongot) can start a little after mongod reports
   * healthy, so this retries for ~1 minute. Never throws: without the index, search uses in-memory cosine.
   */
  async ensureVectorIndex(attempts = 12, delayMs = 5000): Promise<void> {
    for (let i = 1; i <= attempts; i++) {
      try {
        const col = mongoose.connection.db!.collection('kbChunks');
        const existing = await col.listSearchIndexes(VECTOR_INDEX).toArray();
        if (existing.length === 0) {
          await col.createSearchIndex({
            name: VECTOR_INDEX,
            type: 'vectorSearch',
            definition: {
              fields: [{ type: 'vector', path: 'embedding', numDimensions: this.dimensions, similarity: 'cosine' }],
            },
          });
          logger.info({ index: VECTOR_INDEX }, 'vector search index created (may take a minute to become active)');
        }
        return;
      } catch (err) {
        if (i === attempts) {
          logger.warn({ err: String(err) }, 'could not create the vector search index; search will use in-memory cosine');
          return;
        }
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  private async loadAll(): Promise<KbChunk[]> {
    this.cache ??= await KbChunkModel.find().lean<KbChunk[]>();
    return this.cache;
  }
}
