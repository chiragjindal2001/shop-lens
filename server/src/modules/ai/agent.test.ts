import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { LlmChatRequest, LlmChatResponse, LlmClient } from './llm-client';
import { Agent, MAX_TOOL_ROUNDS } from './agent';
import { ToolRegistry } from './tools/registry';
import { defineTool } from './tools/tool.types';

const seen: { userId: string; args: unknown }[] = [];
const echo = defineTool({
  name: 'echo',
  description: 'echo',
  statusLabel: 'Echoing…',
  schema: z.object({ text: z.string() }),
  async run(args, ctx) {
    seen.push({ userId: ctx.userId, args });
    return { said: args.text };
  },
});

const scripted = (responses: Partial<LlmChatResponse>[]): LlmClient & { requests: LlmChatRequest[] } => {
  const requests: LlmChatRequest[] = [];
  let i = 0;
  return {
    requests,
    async embed() {
      return [];
    },
    async chat(req) {
      requests.push(req);
      const r = responses[Math.min(i++, responses.length - 1)]!;
      if (r.content) req.onToken?.(r.content);
      return { content: '', toolCalls: [], model: 'm', ...r };
    },
  };
};

const input = (over = {}) => ({
  userId: 'real-user',
  conversationId: 'c',
  history: [{ role: 'user' as const, content: 'hi' }],
  onToken: () => {},
  onTool: () => {},
  ...over,
});

describe('Agent', () => {
  it('runs a tool then streams the final answer; userId comes from the request, not the model', async () => {
    const llm = scripted([
      { toolCalls: [{ id: '1', name: 'echo', arguments: JSON.stringify({ text: 'yo', userId: 'attacker' }) }] },
      { content: 'Done!' },
    ]);
    const labels: string[] = [];
    const tokens: string[] = [];
    const res = await new Agent(llm, new ToolRegistry([echo])).run(
      input({ onTool: (t: { label: string }) => labels.push(t.label), onToken: (t: string) => tokens.push(t) }),
    );
    expect(res.content).toBe('Done!');
    expect(res.toolCalls).toEqual([{ name: 'echo', args: { text: 'yo' }, ok: true }]);
    expect(labels).toEqual(['Echoing…']);
    expect(seen.at(-1)!.userId).toBe('real-user');
    expect(JSON.stringify(seen.at(-1)!.args)).not.toContain('attacker');
    // the tool result went back to the model
    expect(llm.requests[1]!.messages.at(-1)).toMatchObject({ role: 'tool', toolCallId: '1' });
  });

  it('caps tool rounds and forces a plain answer afterwards', async () => {
    const loop = { toolCalls: [{ id: 'x', name: 'echo', arguments: '{"text":"again"}' }] };
    const llm = scripted([loop, loop, loop, loop, { content: 'Final' }]);
    const res = await new Agent(llm, new ToolRegistry([echo])).run(input());
    expect(res.toolCalls).toHaveLength(MAX_TOOL_ROUNDS);
    expect(llm.requests.at(-1)!.tools).toBeUndefined();
    expect(res.content).toContain('Final');
  });

  it('reports bad arguments and unknown tools back to the model instead of throwing', async () => {
    const llm = scripted([
      { toolCalls: [{ id: '1', name: 'echo', arguments: '{"text": 42}' }, { id: '2', name: 'nope', arguments: '{}' }] },
      { content: 'ok' },
    ]);
    const res = await new Agent(llm, new ToolRegistry([echo])).run(input());
    expect(res.toolCalls.map((t) => t.ok)).toEqual([false, false]);
  });
});

describe('ToolRegistry', () => {
  it('emits JSON Schema specs from zod', () => {
    const [spec] = new ToolRegistry([echo]).specs();
    expect(spec).toMatchObject({ name: 'echo', parameters: { type: 'object', properties: { text: { type: 'string' } } } });
  });
});
