import type { KbChunk, KnowledgeHit, KnowledgeStore } from '../modules/knowledge/knowledge-store';

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Brute-force cosine similarity. Fine for ~30 chunks; used in tests and as the Atlas fallback. */
export function rankByCosine(chunks: KbChunk[], query: number[], limit: number): KnowledgeHit[] {
  return chunks
    .map((c) => ({ text: c.text, source: c.source, section: c.section, score: cosine(c.embedding, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export class MemoryKnowledgeStore implements KnowledgeStore {
  private chunks: KbChunk[] = [];

  async count() {
    return this.chunks.length;
  }
  async replaceAll(chunks: KbChunk[]) {
    this.chunks = [...chunks];
  }
  async search(queryEmbedding: number[], opts: { limit: number }) {
    return rankByCosine(this.chunks, queryEmbedding, opts.limit);
  }
}
