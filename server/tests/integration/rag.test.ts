import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockLlmClient } from '../../src/infra/llm/mock-client';
import { auth, sendChat, signup, tokensText } from '../helpers/factories';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
beforeAll(async () => {
  env = await startTestEnv();
  await env.container.ingest.ingest(); // real server/kb/*.md, mock embeddings
});
afterAll(() => env.stop());

describe('knowledge-base ingestion', () => {
  it('chunks every KB file into the store, and ingestIfEmpty does not re-ingest', async () => {
    const count = await env.container.knowledge.count();
    expect(count).toBeGreaterThanOrEqual(15);
    expect(await env.container.ingest.ingestIfEmpty()).toBe(0);
    expect(await env.container.knowledge.count()).toBe(count);
  });
});

describe('retrieval quality (mock embeddings)', () => {
  it.each([
    ['How many days do I have to return an item?', 'Returns and Refunds Policy'],
    ['Is cash on delivery available?', 'Payments Policy'],
    ['Do you deliver to Panipat? Is shipping free?', 'Shipping Policy'],
    ['What is the warranty on headphones?', 'Warranty Policy'],
    ['How do I reset my password?', 'Account Help'],
  ])('"%s" → %s', async (question, source) => {
    const [vec] = await new MockLlmClient().embed([question]);
    const [top] = await env.container.knowledge.search(vec!, { limit: 1 });
    expect(top!.source).toBe(source);
  });

  it('an off-topic question scores below the relevance threshold', async () => {
    const hits = await env.container.knowledge.search((await new MockLlmClient().embed(['who won the cricket world cup']))[0]!, { limit: 4 });
    expect(hits.every((h) => h.score < env.container.config.kbMinScore)).toBe(true);
  });
});

describe('search_policies tool through chat', () => {
  it('answers a policy question from the KB, cites the source, and saves it', async () => {
    const u = await signup(env.app);
    const { events } = await sendChat(env.app, u, 'What is your return policy?');
    const names = events.map((e) => e.event);
    expect(names).toContain('tool');
    expect(names.indexOf('sources')).toBeGreaterThan(names.indexOf('token'));
    expect(names.at(-1)).toBe('done');

    const sources = events.find((e) => e.event === 'sources') as Extract<(typeof events)[number], { event: 'sources' }>;
    expect(sources.data.sources.some((s) => s.source === 'Returns and Refunds Policy')).toBe(true);
    expect(tokensText(events)).toMatch(/^According to our Returns and Refunds Policy/);

    const convId = (events[0] as { data: { conversationId: string } }).data.conversationId;
    const conv = await request(env.app).get(`/api/chat/history/${convId}`).set(auth(u)).expect(200);
    const reply = conv.body.messages[1];
    expect(reply.toolCalls[0]).toMatchObject({ name: 'search_policies', ok: true });
    expect(reply.sources[0].source).toBe('Returns and Refunds Policy');
  });

  it('says it does not know (and offers a ticket) when nothing relevant is found', async () => {
    await env.container.knowledge.replaceAll([]); // empty KB → no hits
    const u = await signup(env.app);
    const { events } = await sendChat(env.app, u, 'What is your shipping policy?');
    expect(events.some((e) => e.event === 'sources')).toBe(false);
    expect(tokensText(events)).toMatch(/couldn't find that in our store policies/i);
    await env.container.ingest.ingest(); // restore for other tests
  });

  it('order questions still use order tools, not the KB', async () => {
    const u = await signup(env.app);
    const { events } = await sendChat(env.app, u, 'Where is my order SE1041?');
    expect(events.some((e) => e.event === 'sources')).toBe(false);
    expect(tokensText(events)).toMatch(/SE1041 is shipped/);
  });
});
