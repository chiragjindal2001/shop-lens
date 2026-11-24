import request from 'supertest';
import type { SseEvent } from '@shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { buildContainer } from '../../src/container';
import { MockLlmClient } from '../../src/infra/llm/mock-client';
import { auth, sendChat, signup } from '../helpers/factories';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

const appFor = (nodeEnv: 'development' | 'production') =>
  createApp(
    buildContainer({ ...env.container.config, NODE_ENV: nodeEnv }, { repos: env.repos, llm: new MockLlmClient() }),
  );

describe('token usage and cost are development-only', () => {
  it.each(['production', 'test'] as const)('is not emitted, stored or returned in %s', async (mode) => {
    const app = mode === 'test' ? env.app : appFor('production');
    const u = await signup(app);
    const { events } = await sendChat(app, u, 'Where is my order SE1041?');
    expect(events.some((e) => e.event === 'usage')).toBe(false);

    const convId = (events[0] as { data: { conversationId: string } }).data.conversationId;
    const conv = await request(app).get(`/api/chat/history/${convId}`).set(auth(u)).expect(200);
    expect(conv.body.messages[1].usage).toBeUndefined();
    expect((await env.repos.messages.listByConversation(u.id, convId))[1]!.usage).toBeNull();
  });

  it('in development: emitted just before done, summed over model calls, stored and returned on reload', async () => {
    const app = appFor('development');
    const u = await signup(app);
    // A tool call plus the final answer = two model calls.
    const { events } = await sendChat(app, u, 'Where is my order SE1041?');
    const names = events.map((e) => e.event);
    expect(names.indexOf('usage')).toBe(names.length - 2);
    expect(names.at(-1)).toBe('done');

    const usageEvent = events.find((e): e is Extract<SseEvent, { event: 'usage' }> => e.event === 'usage');
    const usage = usageEvent!.data;
    expect(usage).toMatchObject({ model: 'mock', llmCalls: 2, costUsd: 0 });
    expect(usage.promptTokens).toBeGreaterThan(0);
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);

    const convId = (events[0] as { data: { conversationId: string } }).data.conversationId;
    const conv = await request(app).get(`/api/chat/history/${convId}`).set(auth(u)).expect(200);
    expect(conv.body.messages[1].usage).toEqual(usage); // survives a reload
    expect(conv.body.messages[0].usage).toBeUndefined(); // user messages carry none
  });

  it('in development: an idempotent replay re-sends the stored usage', async () => {
    const app = appFor('development');
    const u = await signup(app);
    const key = crypto.randomUUID();
    const first = await sendChat(app, u, 'hello there', { idempotencyKey: key });
    const second = await sendChat(app, u, 'hello there', { idempotencyKey: key });
    const usageOf = (evs: typeof first.events) => evs.find((e) => e.event === 'usage');
    expect(usageOf(first.events)).toBeTruthy();
    expect(usageOf(second.events)).toEqual(usageOf(first.events));
  });
});
