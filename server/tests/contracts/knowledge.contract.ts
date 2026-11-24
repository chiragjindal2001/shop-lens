import { describe, expect, it } from 'vitest';
import type { KnowledgeStore } from '../../src/modules/knowledge/knowledge-store';

// Tiny 3-d vectors keep the geometry obvious: x-axis = "returns", y-axis = "shipping".
const chunk = (source: string, embedding: number[]) => ({ text: `${source} text`, source, section: 'S', embedding });

export function knowledgeStoreContract(make: () => KnowledgeStore) {
  describe('KnowledgeStore contract', () => {
    it('replaceAll replaces everything and count reflects it', async () => {
      const store = make();
      await store.replaceAll([chunk('A', [1, 0, 0]), chunk('B', [0, 1, 0])]);
      expect(await store.count()).toBe(2);
      await store.replaceAll([chunk('C', [0, 0, 1])]);
      expect(await store.count()).toBe(1);
      await store.replaceAll([]);
      expect(await store.count()).toBe(0);
    });
    it('returns hits ranked by cosine similarity, limited', async () => {
      const store = make();
      await store.replaceAll([chunk('returns', [1, 0, 0]), chunk('shipping', [0, 1, 0]), chunk('both', [1, 1, 0])]);
      const hits = await store.search([1, 0.1, 0], { limit: 2 });
      expect(hits.map((h) => h.source)).toEqual(['returns', 'both']);
      expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);
      expect(hits[0]!.score).toBeGreaterThan(0.9);
      expect(hits[0]).toMatchObject({ text: 'returns text', section: 'S' });
    });
    it('scores are plain cosine: orthogonal ≈ 0', async () => {
      const store = make();
      await store.replaceAll([chunk('x', [1, 0, 0])]);
      const [hit] = await store.search([0, 1, 0], { limit: 1 });
      expect(Math.abs(hit!.score)).toBeLessThan(0.05);
    });
  });
}
