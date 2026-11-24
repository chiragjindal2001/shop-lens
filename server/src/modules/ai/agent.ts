import type { SourceRef, ToolCallRecord, UsageDto } from '@shared';
import { logger } from '../../lib/logger';
import type { LlmClient, LlmMessage } from './llm-client';
import { SYSTEM_PROMPT } from './prompts/system.prompt';
import type { ToolRegistry } from './tools/registry';

export const MAX_TOOL_ROUNDS = 4;

export interface AgentRunInput {
  userId: string;
  conversationId: string;
  history: LlmMessage[];
  signal?: AbortSignal;
  onToken: (text: string) => void;
  onTool: (info: { name: string; label: string }) => void;
}

export interface AgentRunResult {
  content: string;
  toolCalls: ToolCallRecord[];
  sources: SourceRef[];
  model: string;
  /** Summed over every model call in this reply. */
  usage: UsageDto;
}

export class Agent {
  constructor(
    private readonly llm: LlmClient,
    private readonly tools: ToolRegistry,
  ) {}

  /**
   * The model picks tools, the server runs them scoped to the authenticated user, results go back to
   * the model, and the final answer streams out. Capped at MAX_TOOL_ROUNDS tool rounds.
   */
  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const started = Date.now();
    const messages: LlmMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...input.history];
    const records: ToolCallRecord[] = [];
    const sources: SourceRef[] = [];
    const addSources = (more: SourceRef[]) => {
      for (const s of more) if (!sources.some((x) => x.source === s.source && x.section === s.section)) sources.push(s);
    };
    let text = '';
    let model = 'unknown';
    let promptTokens = 0;
    let completionTokens = 0;
    let costUsd: number | null = null;
    let llmCalls = 0;
    const onToken = (t: string) => {
      text += t;
      input.onToken(t);
    };

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const allowTools = round < MAX_TOOL_ROUNDS; // last pass forces a plain answer
      const res = await this.llm.chat({
        messages,
        tools: allowTools ? this.tools.specs() : undefined,
        signal: input.signal,
        onToken,
      });
      model = res.model;
      promptTokens += res.usage?.promptTokens ?? 0;
      completionTokens += res.usage?.completionTokens ?? 0;
      if (res.usage?.costUsd !== undefined) costUsd = (costUsd ?? 0) + res.usage.costUsd;
      llmCalls++;

      if (res.toolCalls.length === 0 || !allowTools) {
        logger.info(
          { model, rounds: round, tools: records.map((r) => r.name), latencyMs: Date.now() - started, promptTokens, completionTokens, costUsd },
          'agent trace',
        );
        const usage: UsageDto = { model, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, costUsd, llmCalls };
        return { content: text, toolCalls: records, sources, model, usage };
      }

      messages.push({ role: 'assistant', content: res.content || null, toolCalls: res.toolCalls });
      for (const call of res.toolCalls) {
        input.onTool({ name: call.name, label: this.tools.label(call.name) });
        const outcome = await this.tools.execute(call.name, call.arguments, {
          userId: input.userId,
          conversationId: input.conversationId,
          addSources,
        });
        records.push({ name: call.name, args: outcome.args, ok: outcome.ok });
        messages.push({ role: 'tool', toolCallId: call.id, content: outcome.content });
      }
      // Text spoken before a tool call belongs to the same reply; separate it from what follows.
      if (text && !text.endsWith('\n')) onToken('\n\n');
    }
    throw new Error('unreachable');
  }
}
