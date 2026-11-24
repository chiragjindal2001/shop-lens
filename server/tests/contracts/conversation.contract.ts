import { describe, expect, it } from 'vitest';
import type { ConversationRepository } from '../../src/modules/chat/conversation.repository';

export function conversationRepositoryContract(make: () => ConversationRepository) {
  describe('ConversationRepository contract', () => {
    it('scopes find/delete/touch by userId', async () => {
      const repo = make();
      const c = await repo.create('alice', 'Hello');
      expect(await repo.findById('bob', c.id)).toBeNull();
      expect(await repo.delete('bob', c.id)).toBe(false);
      expect(await repo.findById('alice', c.id)).toBeTruthy();
      expect(await repo.delete('alice', c.id)).toBe(true);
    });
    it('lists newest-updated first with opaque cursors and no duplicates', async () => {
      const repo = make();
      const created = [];
      for (const t of ['c1', 'c2', 'c3', 'c4', 'c5']) {
        created.push(await repo.create('carol', t));
        await new Promise((r) => setTimeout(r, 5));
      }
      await repo.touch('carol', created[0]!.id); // c1 becomes newest
      const seen: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await repo.listByUser('carol', { cursor, limit: 2 });
        seen.push(...page.items.map((c) => c.title));
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      expect(seen).toEqual(['c1', 'c5', 'c4', 'c3', 'c2']);
      expect((await repo.listByUser('dave', { limit: 10 })).items).toEqual([]);
    });
  });
}
