import { z } from 'zod';
import { NotFoundError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import type { LlmToolSpec } from '../llm-client';
import type { Tool, ToolContext } from './tool.types';

export interface ToolOutcome {
  ok: boolean;
  /** JSON string sent back to the model. */
  content: string;
}

export class ToolRegistry {
  private readonly byName = new Map<string, Tool>();
  private cachedSpecs: LlmToolSpec[] | null = null;

  constructor(tools: Tool[]) {
    for (const t of tools) this.byName.set(t.name, t);
  }

  /**
   * zod schemas → JSON Schema tool definitions for the LLM. Built once: the tools never change, and this is
   * called on every model call (up to 5 per message).
   */
  specs(): LlmToolSpec[] {
    this.cachedSpecs ??= [...this.byName.values()].map((t) => {
      const { $schema: _omit, ...parameters } = z.toJSONSchema(t.schema) as Record<string, unknown>;
      return { name: t.name, description: t.description, parameters };
    });
    return this.cachedSpecs;
  }

  label(name: string): string {
    return this.byName.get(name)?.statusLabel ?? 'Working on it…';
  }

  async execute(name: string, rawArgs: string, ctx: ToolContext): Promise<ToolOutcome & { args: unknown }> {
    const tool = this.byName.get(name);
    if (!tool) return { ok: false, args: null, content: JSON.stringify({ error: `Unknown tool ${name}` }) };

    let args: unknown;
    try {
      args = rawArgs.trim() ? JSON.parse(rawArgs) : {};
    } catch {
      return { ok: false, args: null, content: JSON.stringify({ error: 'Arguments were not valid JSON' }) };
    }
    const parsed = tool.schema.safeParse(args);
    if (!parsed.success) {
      return { ok: false, args, content: JSON.stringify({ error: 'Invalid arguments', details: parsed.error.issues.map((i) => i.message) }) };
    }
    try {
      const result = await tool.run(parsed.data, ctx);
      return { ok: true, args: parsed.data, content: JSON.stringify(result) };
    } catch (err) {
      if (err instanceof NotFoundError) {
        return { ok: false, args: parsed.data, content: JSON.stringify({ error: 'not_found', message: 'No such order for this customer.' }) };
      }
      logger.error({ err, tool: name }, 'tool failed');
      return { ok: false, args: parsed.data, content: JSON.stringify({ error: 'Tool failed. Offer to create a support ticket.' }) };
    }
  }
}
