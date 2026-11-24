import { logger } from './lib/logger';
import type { Container } from './container';
import { ensureIndexes } from './infra/mongo/indexes';

/** Idempotent startup work: indexes, vector index, demo seed, and KB ingestion when the KB is empty. */
export async function bootstrap(c: Container): Promise<void> {
  await ensureIndexes();
  await c.auth.ensureDemoUser();
  try {
    const n = await c.ingest.ingestIfEmpty();
    if (n > 0) logger.info({ chunks: n }, 'knowledge base was empty, ingested');
  } catch (err) {
    // The app still works without RAG (policy questions get "I don't know" + ticket offer).
    logger.error({ err: String(err) }, 'knowledge-base ingestion failed; run `npm run ingest` once the embedding API works');
  }
  // Background: waits for the search sidecar; doesn't delay startup. Search falls back to in-memory meanwhile.
  void c.knowledge.ensureVectorIndex?.();
  logger.info('bootstrap complete');
}
