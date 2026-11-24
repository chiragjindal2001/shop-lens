import type { LlmClient } from '../ai/llm-client';
import type { KnowledgeHit, KnowledgeStore } from './knowledge-store';

export const SEARCH_LIMIT = 4;

export class KnowledgeService {
  constructor(
    private readonly llm: LlmClient,
    private readonly store: KnowledgeStore,
    private readonly minScore: number,
  ) {}

  /** Embeds the query, searches the store and drops results below the relevance threshold. */
  async search(query: string, signal?: AbortSignal): Promise<KnowledgeHit[]> {
    const [embedding] = await this.llm.embed([query], signal);
    if (!embedding) return [];
    const hits = await this.store.search(embedding, { limit: SEARCH_LIMIT });
    return hits.filter((h) => h.score >= this.minScore).sort((a, b) => b.score - a.score);
  }
}
