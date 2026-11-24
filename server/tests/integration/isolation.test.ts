import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestEnv, type TestEnv } from '../helpers/test-container';
import { auth, sendChat, signup, tokensText } from '../helpers/factories';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

describe("user A cannot reach user B's data", () => {
  it('through the API: conversations, messages and deletion', async () => {
    const a = await signup(env.app);
    const b = await signup(env.app);
    const { events } = await sendChat(env.app, b, 'my private question');
    const convId = (events[0] as any).data.conversationId;

    await request(env.app).get(`/api/chat/history/${convId}`).set(auth(a)).expect(404);
    await request(env.app).delete(`/api/chat/history/${convId}`).set(auth(a)).expect(404);
    const list = await request(env.app).get('/api/chat/history').set(auth(a)).expect(200);
    expect(list.body.conversations).toHaveLength(0);
    // A cannot append to B's conversation either.
    expect((await sendChat(env.app, a, 'hijack', { conversationId: convId })).res.status).toBe(404);
    // B's data is intact.
    await request(env.app).get(`/api/chat/history/${convId}`).set(auth(b)).expect(200);
  });

  it("through the repositories: every user-owned method is scoped by userId", async () => {
    const a = await signup(env.app);
    const b = await signup(env.app);
    expect(await env.repos.orders.findByOrderNumber(a.id, 'SE1042')).toBeTruthy();
    const bOrder = await env.repos.orders.findByOrderNumber(b.id, 'SE1042');
    expect(bOrder!.userId).toBe(b.id);
    expect(bOrder!.userId).not.toBe(a.id);
    // transitionStatus on A cannot touch B's identical order number
    await env.repos.orders.transitionStatus(a.id, 'SE1040', ['packed'], 'cancelled');
    expect((await env.repos.orders.findByOrderNumber(b.id, 'SE1040'))!.status).toBe('packed');
  });

  it("through the AI tools: asking about someone else's order returns 'not found'", async () => {
    const a = await signup(env.app);
    // Create an order only B has, with a distinctive number.
    const b = await signup(env.app);
    await env.repos.orders.createMany(b.id, [
      { orderNumber: 'SE9999', items: [{ name: 'Secret Gadget', quantity: 1, price: 1 }], total: 1, status: 'packed', placedAt: new Date(), expectedDeliveryAt: null, deliveredAt: null },
    ]);
    const { events } = await sendChat(env.app, a, 'Where is order SE9999?');
    const reply = tokensText(events);
    expect(reply).toMatch(/couldn't find/i);
    expect(reply).not.toMatch(/Secret Gadget/);
    // ...and B really owns it, untouched by A's attempts to cancel it.
    const cancel = await sendChat(env.app, a, 'Please cancel SE9999');
    expect(tokensText(cancel.events)).toMatch(/couldn't find/i);
    expect((await env.repos.orders.findByOrderNumber(b.id, 'SE9999'))!.status).toBe('packed');
  });
});
