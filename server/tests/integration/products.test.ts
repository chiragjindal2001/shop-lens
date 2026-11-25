import request from 'supertest';
import type { SseEvent } from '@shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, sendChat, signup, tokensText } from '../helpers/factories';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

describe('GET /api/products', () => {
  it('requires authentication', async () => {
    await request(env.app).get('/api/products').expect(401);
  });

  it('returns the catalog with price, features, warranty and the free-shipping flag', async () => {
    const u = await signup(env.app);
    const res = await request(env.app).get('/api/products').set(auth(u)).expect(200);
    const products = res.body.products as Array<Record<string, unknown>>;
    expect(products).toHaveLength(6);
    const airdopes = products.find((p) => p.name === 'boAt Airdopes 141 Earbuds')!;
    expect(airdopes).toMatchObject({ price: 1499, warranty: '1 year', freeShipping: true, category: 'Earbuds' });
    expect(airdopes.features).toEqual(expect.arrayContaining(['Bluetooth 5.1']));
    expect(products.find((p) => p.name === 'USB-C Charging Cable 1m')).toMatchObject({ freeShipping: false });
  });
});

describe('asking about a product in chat', () => {
  it('"Tell me about …" describes the product itself, from the catalog, and cites it', async () => {
    const u = await signup(env.app);
    const { events } = await sendChat(env.app, u, 'Tell me about the boAt Airdopes 141 Earbuds');

    const tool = events.find((e) => e.event === 'tool') as Extract<SseEvent, { event: 'tool' }>;
    expect(tool.data.name).toBe('search_products');

    const reply = tokensText(events);
    expect(reply).toContain('boAt Airdopes 141 Earbuds');
    expect(reply).toContain('₹1499');
    expect(reply).toMatch(/42 hours/); // a real feature from the catalog, not a generic warranty answer
    expect(reply).not.toMatch(/According to our Warranty Policy/);

    const sources = events.find((e) => e.event === 'sources') as Extract<SseEvent, { event: 'sources' }>;
    expect(sources.data.sources).toEqual([{ source: 'Product catalog', section: 'boAt Airdopes 141 Earbuds' }]);
  });

  it('a budget question lists matching products', async () => {
    const u = await signup(env.app);
    const { events } = await sendChat(env.app, u, 'What earbuds do you have?');
    expect(tokensText(events)).toMatch(/boAt Airdopes 141 Earbuds/);
  });

  it('a product we do not sell gets an honest "not in our catalog"', async () => {
    const u = await signup(env.app);
    const { events } = await sendChat(env.app, u, 'Tell me about the Sony WH-1000XM5 headphones');
    expect(tokensText(events)).toMatch(/couldn't find that in our catalog/i);
    expect(events.some((e) => e.event === 'sources')).toBe(false);
  });

  it('policy and order questions are not hijacked by the product tool', async () => {
    const u = await signup(env.app);
    const warranty = await sendChat(env.app, u, 'What is the warranty on headphones?');
    expect((warranty.events.find((e) => e.event === 'tool') as Extract<SseEvent, { event: 'tool' }>).data.name).toBe('search_policies');
    const order = await sendChat(env.app, u, 'Where is my order SE1041?');
    expect((order.events.find((e) => e.event === 'tool') as Extract<SseEvent, { event: 'tool' }>).data.name).toBe('get_order_status');
  });
});
