import { describe, expect, it } from 'vitest';
import type { MessageRepository } from '../../src/modules/chat/message.repository';

export function messageRepositoryContract(make: () => MessageRepository) {
  describe('MessageRepository contract', () => {
    it('insertIfAbsent returns the existing message for a repeated key', async () => {
      const repo = make();
      const input = { conversationId: 'c1', role: 'user' as const, content: 'hi', status: 'complete' as const, idempotencyKey: 'key-12345' };
      const first = await repo.insertIfAbsent('u1', input);
      const second = await repo.insertIfAbsent('u1', { ...input, content: 'different' });
      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(second.message.id).toBe(first.message.id);
      expect(second.message.content).toBe('hi');
    });
    it('keys are per user', async () => {
      const repo = make();
      const input = { conversationId: 'c1', role: 'user' as const, content: 'hi', status: 'complete' as const, idempotencyKey: 'shared-key-1' };
      expect((await repo.insertIfAbsent('u1', input)).created).toBe(true);
      expect((await repo.insertIfAbsent('u2', input)).created).toBe(true);
      expect(await repo.findByIdempotencyKey('u3', 'shared-key-1')).toBeNull();
    });
    it('messages without a key never collide', async () => {
      const repo = make();
      await repo.create('u1', { conversationId: 'c1', role: 'assistant', content: 'a', status: 'complete' });
      await repo.create('u1', { conversationId: 'c1', role: 'assistant', content: 'b', status: 'complete' });
      expect(await repo.listByConversation('u1', 'c1')).toHaveLength(2);
    });
    it('lists by conversation in order, scoped by user; listRecent returns the last N oldest-first', async () => {
      const repo = make();
      for (const t of ['1', '2', '3', '4']) {
        await repo.create('u1', { conversationId: 'c2', role: 'user', content: t, status: 'complete' });
        await new Promise((r) => setTimeout(r, 3));
      }
      expect((await repo.listByConversation('u1', 'c2')).map((m) => m.content)).toEqual(['1', '2', '3', '4']);
      expect((await repo.listRecent('u1', 'c2', 2)).map((m) => m.content)).toEqual(['3', '4']);
      expect(await repo.listByConversation('u2', 'c2')).toEqual([]);
    });
    it('update and deleteById are scoped and findReplyTo links replies', async () => {
      const repo = make();
      const user = await repo.create('u1', { conversationId: 'c3', role: 'user', content: 'q', status: 'complete' });
      const reply = await repo.create('u1', { conversationId: 'c3', role: 'assistant', content: '', status: 'partial', replyTo: user.id });
      await repo.update('u2', reply.id, { content: 'hacked' });
      await repo.update('u1', reply.id, { content: 'answer', status: 'complete', toolCalls: [{ name: 't', args: {}, ok: true }] });
      const found = (await repo.findReplyTo('u1', user.id))!;
      expect(found).toMatchObject({ content: 'answer', status: 'complete' });
      expect(found.toolCalls).toHaveLength(1);
      await repo.deleteById('u2', reply.id);
      expect(await repo.findReplyTo('u1', user.id)).toBeTruthy();
      await repo.deleteById('u1', reply.id);
      expect(await repo.findReplyTo('u1', user.id)).toBeNull();
    });
  });
}
