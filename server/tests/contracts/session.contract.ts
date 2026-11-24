import { describe, expect, it } from 'vitest';
import type { SessionRepository } from '../../src/modules/auth/session.repository';

export function sessionRepositoryContract(make: () => SessionRepository) {
  const future = () => new Date(Date.now() + 60_000);
  describe('SessionRepository contract', () => {
    it('rotate is compare-and-set on the stored hash', async () => {
      const repo = make();
      const s = await repo.create({ userId: 'u1', refreshTokenHash: 'h1', expiresAt: future() });
      expect(await repo.rotate(s.id, 'wrong', 'h2', future())).toBe(false);
      expect(await repo.rotate(s.id, 'h1', 'h2', future())).toBe(true);
      expect(await repo.rotate(s.id, 'h1', 'h3', future())).toBe(false); // replay of the old hash
      expect((await repo.findById(s.id))!.refreshTokenHash).toBe('h2');
    });
    it('revoked sessions cannot rotate', async () => {
      const repo = make();
      const s = await repo.create({ userId: 'u1', refreshTokenHash: 'h1', expiresAt: future() });
      await repo.revoke(s.id);
      expect((await repo.findById(s.id))!.revokedAt).toBeInstanceOf(Date);
      expect(await repo.rotate(s.id, 'h1', 'h2', future())).toBe(false);
    });
    it('expired sessions cannot rotate', async () => {
      const repo = make();
      const s = await repo.create({ userId: 'u1', refreshTokenHash: 'h1', expiresAt: new Date(Date.now() - 1000) });
      expect(await repo.rotate(s.id, 'h1', 'h2', future())).toBe(false);
    });
  });
}
