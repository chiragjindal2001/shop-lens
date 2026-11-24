export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string; // raw JSON string produced by the model
}

export type LlmMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export interface LlmToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface LlmChatRequest {
  messages: LlmMessage[];
  tools?: LlmToolSpec[];
  signal?: AbortSignal;
  /** Called for every text delta as it streams. */
  onToken?: (text: string) => void;
}

export interface LlmChatResponse {
  content: string;
  toolCalls: LlmToolCall[];
  model: string;
  usage?: { promptTokens: number; completionTokens: number; /** USD, when the provider reports it */ costUsd?: number };
}

export interface LlmClient {
  chat(req: LlmChatRequest): Promise<LlmChatResponse>;
  /** One embedding vector per input text, in order. */
  embed(texts: string[], signal?: AbortSignal): Promise<number[][]>;
}
