import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, sendChat, signup } from '../helpers/factories';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

describe('GET /api/orders', () => {
  it('requires authentication', async () => {
    await request(env.app).get('/api/orders').expect(401);
    await request(env.app).get('/api/orders').set('Authorization', 'Bearer nope').expect(401);
  });

  it('returns the logged-in customer\'s orders, newest first, with dates as ISO strings', async () => {
    const u = await signup(env.app);
    const res = await request(env.app).get('/api/orders').set(auth(u)).expect(200);
    const orders = res.body.orders as Array<Record<string, unknown>>;

    expect(orders.map((o) => o.orderNumber)).toEqual(['SE1040', 'SE1041', 'SE1042', 'SE1039']);
    const byNumber = Object.fromEntries(orders.map((o) => [o.orderNumber, o]));
    expect(byNumber.SE1041).toMatchObject({
      status: 'shipped',
      total: 1799,
      items: [{ name: 'Mi Power Bank 20000mAh', quantity: 1, price: 1799 }],
      deliveredAt: null,
    });
    expect(new Date(byNumber.SE1042!.deliveredAt as string).toISOString()).toBe(byNumber.SE1042!.deliveredAt);
    expect(byNumber.SE1040).toMatchObject({ status: 'packed' });
    // internal fields never leak
    expect(JSON.stringify(res.body)).not.toMatch(/userId|"id"|_id/);
  });

  it("never shows another customer's orders, and reflects changes the assistant makes", async () => {
    const a = await signup(env.app);
    const b = await signup(env.app);
    await env.repos.orders.createMany(b.id, [
      { orderNumber: 'SE7777', items: [{ name: 'Secret Gadget', quantity: 1, price: 5 }], total: 5, status: 'placed', placedAt: new Date(), expectedDeliveryAt: null, deliveredAt: null },
    ]);
    const aOrders = (await request(env.app).get('/api/orders').set(auth(a)).expect(200)).body.orders;
    expect(JSON.stringify(aOrders)).not.toContain('SE7777');
    expect(JSON.stringify((await request(env.app).get('/api/orders').set(auth(b)).expect(200)).body.orders)).toContain('SE7777');

    // The assistant cancels SE1040 (packed) → the orders endpoint shows it as cancelled.
    await sendChat(env.app, a, 'Please cancel order SE1040');
    const after = (await request(env.app).get('/api/orders').set(auth(a)).expect(200)).body.orders as Array<{ orderNumber: string; status: string }>;
    expect(after.find((o) => o.orderNumber === 'SE1040')!.status).toBe('cancelled');
  });
});
