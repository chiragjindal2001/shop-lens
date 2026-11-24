import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockLlmClient } from '../../src/infra/llm/mock-client';
import type { LlmChatRequest, LlmChatResponse, LlmClient } from '../../src/modules/ai/llm-client';
import { startTestEnv, type TestEnv } from '../helpers/test-container';
import { auth, sendChat, signup, tokensText } from '../helpers/factories';

class CountingLlm implements LlmClient {
  calls = 0;
  failNext = false;
  private inner = new MockLlmClient();
  embed(texts: string[]) {
    return this.inner.embed(texts);
  }
  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    this.calls++;
    if (this.failNext) {
      this.failNext = false;
      req.onToken?.('Partial ');
      throw new Error('boom');
    }
    return this.inner.chat(req);
  }
}

const llm = new CountingLlm();
let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv({ llm })));
afterAll(() => env.stop());

describe('POST /chat/send', () => {
  it('streams meta → tool → token… → done and persists both messages', async () => {
    const u = await signup(env.app);
    const { res, events } = await sendChat(env.app, u, 'Where is my order SE1041?');
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.headers['x-accel-buffering']).toBe('no');
    const names = events.map((e) => e.event);
    expect(names[0]).toBe('meta');
    expect(names).toContain('tool');
    expect(names).toContain('token');
    expect(names[names.length - 1]).toBe('done');
    expect(tokensText(events)).toMatch(/SE1041 is shipped/);

    const meta = events[0] as Extract<(typeof events)[number], { event: 'meta' }>;
    const conv = await request(env.app).get(`/api/chat/history/${meta.data.conversationId}`).set(auth(u)).expect(200);
    expect(conv.body.messages.map((m: any) => m.role)).toEqual(['user', 'assistant']);
    expect(conv.body.messages[1].status).toBe('complete');
    expect(conv.body.messages[1].toolCalls[0]).toMatchObject({ name: 'get_order_status', ok: true });
    expect(conv.body.conversation.title).toBe('Where is my order SE1041?');
  });

  it('lists conversations newest first with cursor pagination', async () => {
    const u = await signup(env.app);
    for (const t of ['one', 'two', 'three']) await sendChat(env.app, u, t);
    const p1 = await request(env.app).get('/api/chat/history?limit=2').set(auth(u)).expect(200);
    expect(p1.body.conversations.map((c: any) => c.title)).toEqual(['three', 'two']);
    expect(p1.body.nextCursor).toBeTruthy();
    const p2 = await request(env.app).get(`/api/chat/history?limit=2&cursor=${p1.body.nextCursor}`).set(auth(u)).expect(200);
    expect(p2.body.conversations.map((c: any) => c.title)).toEqual(['one']);
    expect(p2.body.nextCursor).toBeNull();
  });

  it('is idempotent: same key twice → one stored user message and one LLM call', async () => {
    const u = await signup(env.app);
    const key = crypto.randomUUID();
    const before = llm.calls;
    const first = await sendChat(env.app, u, 'hello there', { idempotencyKey: key });
    const second = await sendChat(env.app, u, 'hello there', { idempotencyKey: key });
    expect(llm.calls - before).toBe(1);
    expect(tokensText(second.events)).toBe(tokensText(first.events));
    const convId = (first.events[0] as any).data.conversationId;
    const msgs = await env.repos.messages.listByConversation(u.id, convId);
    expect(msgs.filter((m) => m.role === 'user')).toHaveLength(1);
    expect(msgs.filter((m) => m.role === 'assistant')).toHaveLength(1);
  });

  it('saves a partial reply on failure and a retry with the same key completes it', async () => {
    const u = await signup(env.app);
    const key = crypto.randomUUID();
    llm.failNext = true;
    const failed = await sendChat(env.app, u, 'hi', { idempotencyKey: key });
    expect(failed.events.map((e) => e.event)).toContain('error');
    const convId = (failed.events[0] as any).data.conversationId;
    let msgs = await env.repos.messages.listByConversation(u.id, convId);
    expect(msgs[1]).toMatchObject({ role: 'assistant', status: 'partial', content: 'Partial ' });

    const retry = await sendChat(env.app, u, 'hi', { idempotencyKey: key });
    expect(retry.events[retry.events.length - 1]!.event).toBe('done');
    msgs = await env.repos.messages.listByConversation(u.id, convId);
    expect(msgs.map((m) => `${m.role}:${m.status}`)).toEqual(['user:complete', 'assistant:complete']);
  });

  it('validates input: empty and over-long messages are 400 before any stream opens', async () => {
    const u = await signup(env.app);
    expect((await sendChat(env.app, u, '   ')).res.status).toBe(400);
    expect((await sendChat(env.app, u, 'x'.repeat(2001))).res.status).toBe(400);
  });

  it('404s for an unknown conversation id', async () => {
    const u = await signup(env.app);
    expect((await sendChat(env.app, u, 'hi', { conversationId: '64b000000000000000000000' })).res.status).toBe(404);
    expect((await sendChat(env.app, u, 'hi', { conversationId: 'not-an-id' })).res.status).toBe(404);
  });

  it('deletes a conversation', async () => {
    const u = await signup(env.app);
    const { events } = await sendChat(env.app, u, 'to delete');
    const id = (events[0] as any).data.conversationId;
    await request(env.app).delete(`/api/chat/history/${id}`).set(auth(u)).expect(204);
    await request(env.app).get(`/api/chat/history/${id}`).set(auth(u)).expect(404);
  });
});

describe('rate limiting', () => {
  it('returns 429 after the chat limit, per user', async () => {
    const limited = await startLimited();
    const a = await signup(limited.app);
    const b = await signup(limited.app);
    expect((await sendChat(limited.app, a, 'hi')).res.status).toBe(200);
    expect((await sendChat(limited.app, a, 'hi again')).res.status).toBe(200);
    expect((await sendChat(limited.app, a, 'third')).res.status).toBe(429);
    expect((await sendChat(limited.app, b, 'other user is fine')).res.status).toBe(200);
  });

  async function startLimited() {
    // Same process, same Mongo connection: only the app/config differ.
    const { createApp } = await import('../../src/app');
    const { buildContainer } = await import('../../src/container');
    const config = { ...env.container.config, rateLimits: { ...env.container.config.rateLimits, chat: { windowMs: 60_000, limit: 2 } } };
    return { app: createApp(buildContainer(config, { repos: env.repos, llm: new MockLlmClient() })) };
  }
});
