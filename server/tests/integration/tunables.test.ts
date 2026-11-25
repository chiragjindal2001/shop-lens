import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { buildContainer } from '../../src/container';
import { MockLlmClient } from '../../src/infra/llm/mock-client';
import { Agent } from '../../src/modules/ai/agent';
import type { LlmChatRequest, LlmChatResponse, LlmClient } from '../../src/modules/ai/llm-client';
import { ToolRegistry } from '../../src/modules/ai/tools/registry';
import { checkReturnEligibilityTool } from '../../src/modules/ai/tools/check-return-eligibility.tool';
import { defineTool } from '../../src/modules/ai/tools/tool.types';
import { OrderService } from '../../src/modules/orders/order.service';
import { sendChat, signup } from '../helpers/factories';
import { startTestEnv, type TestEnv } from '../helpers/test-container';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());

const baseEnv = () => ({
  MONGO_HOST: 'x',
  MONGO_DB_NAME: 'x',
  JWT_ACCESS_SECRET: env.container.config.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: env.container.config.JWT_REFRESH_SECRET,
  LLM_PROVIDER: 'mock',
  NODE_ENV: 'test',
  BCRYPT_COST: '4',
});

describe('return window (OrderService option)', () => {
  beforeEach(() => env.clear());
  const USER = 'tunables-user';

  // SE1042 was delivered 4 days ago.
  it.each([
    [3, false],
    [4, true],
    [30, true],
  ])('a %s-day window: SE1042 (delivered 4 days ago) eligible = %s', async (days, eligible) => {
    const svc = new OrderService(env.repos.orders, env.repos.returns, { returnWindowDays: days });
    await svc.seedDemoOrders(USER);
    const r = await svc.checkReturnEligibility(USER, 'SE1042');
    expect(r.eligible).toBe(eligible);
    expect(r.reason).toContain(`${days}-day`);
  });

  it('SE1039 (delivered 40 days ago) becomes returnable with a 45-day window', async () => {
    const svc = new OrderService(env.repos.orders, env.repos.returns, { returnWindowDays: 45 });
    await svc.seedDemoOrders(USER);
    expect((await svc.createReturnRequest(USER, 'SE1039', 'changed my mind')).ok).toBe(true);
  });

  it("the model's tool description reflects the configured window", () => {
    const svc = new OrderService(env.repos.orders, env.repos.returns, { returnWindowDays: 14 });
    expect(checkReturnEligibilityTool(svc).description).toContain('14-day');
  });
});

describe('MAX_TOOL_ROUNDS', () => {
  const echo = defineTool({
    name: 'echo',
    description: 'echo',
    statusLabel: 'Echoing…',
    schema: z.object({}),
    async run() {
      return { ok: true };
    },
  });
  const looping = (): LlmClient => ({
    async embed() {
      return [];
    },
    async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
      if (!req.tools) return { content: 'final answer', toolCalls: [], model: 'm' };
      return { content: '', model: 'm', toolCalls: [{ id: 'c', name: 'echo', arguments: '{}' }] };
    },
  });
  const run = (maxToolRounds: number) =>
    new Agent(looping(), new ToolRegistry([echo]), { maxToolRounds }).run({
      userId: 'u',
      conversationId: 'c',
      history: [{ role: 'user', content: 'hi' }],
      onToken: () => {},
      onTool: () => {},
    });

  it.each([1, 2, 6])('stops after %s tool round(s) and forces a plain answer', async (rounds) => {
    const res = await run(rounds);
    expect(res.toolCalls).toHaveLength(rounds);
    expect(res.usage.llmCalls).toBe(rounds + 1);
  });
});

describe('rate limits from the environment', () => {
  it('RATE_LIMIT_CHAT_MAX=2 → the third message in the window is 429', async () => {
    const cfg = loadConfig({ ...baseEnv(), RATE_LIMIT_CHAT_MAX: '2', RATE_LIMIT_CHAT_WINDOW: '5m' });
    const app = createApp(buildContainer(cfg, { repos: env.repos, llm: new MockLlmClient() }));
    const u = await signup(app);
    expect((await sendChat(app, u, 'one')).res.status).toBe(200);
    expect((await sendChat(app, u, 'two')).res.status).toBe(200);
    expect((await sendChat(app, u, 'three')).res.status).toBe(429);
  });
});

describe('HISTORY_MAX_MESSAGES reaches the model', () => {
  it('only the configured number of recent messages is sent', async () => {
    const seen: number[] = [];
    const llm: LlmClient = {
      async embed() {
        return [];
      },
      async chat(req) {
        seen.push(req.messages.filter((m) => m.role !== 'system').length);
        req.onToken?.('ok'); // like a real model: the reply is streamed, and that streamed text is what gets saved
        return { content: 'ok', toolCalls: [], model: 'm' };
      },
    };
    const cfg = loadConfig({ ...baseEnv(), HISTORY_MAX_MESSAGES: '3' });
    const app = createApp(buildContainer(cfg, { repos: env.repos, llm }));
    const u = await signup(app);
    const first = await sendChat(app, u, 'message 1');
    const conversationId = (first.events[0] as { data: { conversationId: string } }).data.conversationId;
    for (let i = 2; i <= 5; i++) await sendChat(app, u, `message ${i}`, { conversationId });
    // First turn: just the question. Then the two most recent earlier messages plus the new one, never more.
    expect(seen).toEqual([1, 3, 3, 3, 3]);
  });
});
