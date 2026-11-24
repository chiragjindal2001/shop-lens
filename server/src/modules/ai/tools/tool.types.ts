import type { SourceRef } from '@shared';
import type { z } from 'zod';

/** userId always comes from the authenticated request, never from model output. */
export interface ToolContext {
  userId: string;
  conversationId: string;
  /** Lets a tool cite knowledge-base sources; they are streamed to the UI and saved with the reply. */
  addSources(sources: SourceRef[]): void;
}

export interface Tool<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  /** Shown in the UI while the tool runs (also acts as the typing indicator). */
  statusLabel: string;
  schema: S;
  run(args: z.infer<S>, ctx: ToolContext): Promise<unknown>;
}

export const defineTool = <S extends z.ZodType>(tool: Tool<S>): Tool<S> => tool;
