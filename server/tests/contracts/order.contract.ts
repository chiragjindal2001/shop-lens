import { describe, expect, it } from 'vitest';
import type { NewOrder, OrderRepository } from '../../src/modules/orders/order.repository';

const order = (n: string, status: NewOrder['status'] = 'placed', placedAt = new Date()): NewOrder => ({
  orderNumber: n,
  items: [{ name: 'Thing', quantity: 1, price: 100 }],
  total: 100,
  status,
  placedAt,
  expectedDeliveryAt: null,
  deliveredAt: null,
});

export function orderRepositoryContract(make: () => OrderRepository) {
  describe('OrderRepository contract', () => {
    it('the same order number can exist for different users, each scoped', async () => {
      const repo = make();
      await repo.createMany('u1', [order('SE1')]);
      await repo.createMany('u2', [order('SE1')]);
      expect((await repo.findByOrderNumber('u1', 'SE1'))!.userId).toBe('u1');
      expect(await repo.findByOrderNumber('u3', 'SE1')).toBeNull();
    });
    it('lists newest first with a limit', async () => {
      const repo = make();
      await repo.createMany('u1', [order('A', 'placed', new Date(1000)), order('B', 'placed', new Date(3000)), order('C', 'placed', new Date(2000))]);
      expect((await repo.listByUser('u1', 2)).map((o) => o.orderNumber)).toEqual(['B', 'C']);
    });
    it('transitionStatus is an atomic compare-and-set', async () => {
      const repo = make();
      await repo.createMany('u1', [order('X', 'placed'), order('Y', 'shipped')]);
      expect((await repo.transitionStatus('u1', 'X', ['placed', 'packed'], 'cancelled'))!.status).toBe('cancelled');
      expect(await repo.transitionStatus('u1', 'X', ['placed', 'packed'], 'cancelled')).toBeNull(); // already moved
      expect(await repo.transitionStatus('u1', 'Y', ['placed', 'packed'], 'cancelled')).toBeNull(); // wrong state
      expect(await repo.transitionStatus('u2', 'X', ['cancelled'], 'placed')).toBeNull(); // wrong user
    });
    it('only one of two concurrent transitions wins', async () => {
      const repo = make();
      await repo.createMany('u1', [order('Z', 'placed')]);
      const results = await Promise.all([
        repo.transitionStatus('u1', 'Z', ['placed'], 'cancelled'),
        repo.transitionStatus('u1', 'Z', ['placed'], 'cancelled'),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });
}
