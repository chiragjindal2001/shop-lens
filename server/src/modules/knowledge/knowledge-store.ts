export interface KbChunk {
  text: string;
  /** Document title, e.g. "Returns Policy": shown to the user as the source tag. */
  source: string;
  /** Section heading inside the document. */
  section: string;
  embedding: number[];
}

export interface KnowledgeHit {
  text: string;
  source: string;
  section: string;
  /** Cosine similarity, -1..1 (higher is more similar). */
  score: number;
}

/** Vector store for knowledge-base chunks. Production: Atlas Vector Search. Tests/fallback: in-memory cosine. */
export interface KnowledgeStore {
  count(): Promise<number>;
  /** Replaces the whole knowledge base (re-ingestion is delete + insert). */
  replaceAll(chunks: KbChunk[]): Promise<void>;
  search(queryEmbedding: number[], opts: { limit: number }): Promise<KnowledgeHit[]>;
}
