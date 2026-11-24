import { describe, expect, it } from 'vitest';
import { DuplicateEmailError } from '../../src/lib/errors';
import type { UserRepository } from '../../src/modules/auth/user.repository';

export function userRepositoryContract(make: () => UserRepository) {
  describe('UserRepository contract', () => {
    it('creates and finds by email (case-insensitive) and id', async () => {
      const repo = make();
      const u = await repo.create({ name: 'Asha', email: 'Asha@Example.com', passwordHash: 'h' });
      expect(u.email).toBe('asha@example.com');
      expect((await repo.findByEmail('ASHA@example.com'))!.id).toBe(u.id);
      expect((await repo.findById(u.id))!.name).toBe('Asha');
    });
    it('throws DuplicateEmailError on a duplicate email', async () => {
      const repo = make();
      await repo.create({ name: 'A', email: 'dup@example.com', passwordHash: 'h' });
      await expect(repo.create({ name: 'B', email: 'DUP@example.com', passwordHash: 'h' })).rejects.toBeInstanceOf(DuplicateEmailError);
    });
    it('returns null for unknown or malformed ids', async () => {
      const repo = make();
      expect(await repo.findById('not-an-id')).toBeNull();
      expect(await repo.findById('64b000000000000000000000')).toBeNull();
      expect(await repo.findByEmail('nobody@example.com')).toBeNull();
    });
  });
}
