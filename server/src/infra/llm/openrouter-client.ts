import { LlmError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type {
  LlmChatRequest,
  LlmChatResponse,
  LlmClient,
  LlmMessage,
  LlmToolCall,
} from '../../modules/ai/llm-client';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const EMBEDDINGS_ENDPOINT = 'https://openrouter.ai/api/v1/embeddings';

interface Options {
  apiKey: string;
  /** First is the primary model; the rest form OpenRouter's fallback chain. */
  models: string[];
  /** Embedding model id, e.g. openai/text-embedding-3-small. */
  embeddingModel?: string;
  /** Max output tokens per call (sent as max_tokens). */
  maxTokens?: number;
  referer?: string;
  fetchImpl?: typeof fetch;
}

export class OpenRouterClient implements LlmClient {
  private readonly fetch: typeof fetch;
  constructor(private readonly opts: Options) {
    this.fetch = opts.fetchImpl ?? fetch;
  }

  async embed(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    if (texts.length === 0) return [];
    let res: Response;
    try {
      res = await this.fetch(EMBEDDINGS_ENDPOINT, {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${this.opts.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.opts.embeddingModel ?? 'openai/text-embedding-3-small', input: texts }),
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new LlmError(`Network error calling OpenRouter embeddings: ${String(err)}`, undefined, true);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new LlmError(`OpenRouter embeddings ${res.status}: ${text.slice(0, 300)}`, res.status);
    }
    const body = (await res.json()) as { data?: { index: number; embedding: number[] }[]; error?: { message?: string } };
    if (!body.data || body.data.length !== texts.length) {
      throw new LlmError(`OpenRouter embeddings returned an unexpected response: ${body.error?.message ?? 'no data'}`);
    }
    return [...body.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    const [primary, ...rest] = this.opts.models;
    const body = {
      model: primary,
      ...(rest.length > 0 ? { models: this.opts.models } : {}), // OpenRouter-side fallback chain
      messages: req.messages.map(toWire),
      stream: true,
      ...(this.opts.maxTokens ? { max_tokens: this.opts.maxTokens } : {}),
      stream_options: { include_usage: true },
      usage: { include: true }, // ask OpenRouter to report the cost with the usage
      ...(req.tools?.length
        ? { tools: req.tools.map((t) => ({ type: 'function', function: t })), tool_choice: 'auto' }
        : {}),
    };

    let res: Response;
    try {
      res = await this.fetch(ENDPOINT, {
        method: 'POST',
        signal: req.signal,
        headers: {
          Authorization: `Bearer ${this.opts.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.opts.referer ? { 'HTTP-Referer': this.opts.referer, 'X-Title': 'Shoplens Support' } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (req.signal?.aborted) throw err;
      throw new LlmError(`Network error calling OpenRouter: ${String(err)}`, undefined, true);
    }
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new LlmError(`OpenRouter ${res.status}: ${text.slice(0, 300)}`, res.status);
    }

    let content = '';
    let model = primary ?? 'unknown';
    let usage: LlmChatResponse['usage'];
    const calls = new Map<number, LlmToolCall>();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith('data:')) continue; // blank lines and ": OPENROUTER PROCESSING" comments
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          let chunk: any;
          try {
            chunk = JSON.parse(data);
          } catch {
            continue;
          }
          if (chunk.error) {
            const status = Number(chunk.error.code) || undefined;
            throw new LlmError(`OpenRouter stream error: ${chunk.error.message ?? 'unknown'}`, status, status === undefined);
          }
          if (chunk.model) model = chunk.model;
          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens ?? 0,
              completionTokens: chunk.usage.completion_tokens ?? 0,
              ...(typeof chunk.usage.cost === 'number' ? { costUsd: chunk.usage.cost } : {}),
            };
          }
          if (chunk.choices?.[0]?.finish_reason === 'length') {
            logger.warn({ model, maxTokens: this.opts.maxTokens }, 'reply was cut off by the max_tokens limit');
          }
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            content += delta.content;
            req.onToken?.(delta.content);
          }
          for (const tc of delta?.tool_calls ?? []) {
            const cur = calls.get(tc.index ?? 0) ?? { id: '', name: '', arguments: '' };
            if (tc.id) cur.id = tc.id;
            if (tc.function?.name) cur.name += tc.function.name;
            if (tc.function?.arguments) cur.arguments += tc.function.arguments;
            calls.set(tc.index ?? 0, cur);
          }
        }
      }
    } finally {
      reader.releaseLock?.();
    }

    const toolCalls = [...calls.values()].filter((c) => c.name).map((c, i) => ({ ...c, id: c.id || `call_${i}` }));
    logger.debug({ model, toolCalls: toolCalls.length, usage }, 'openrouter response');
    return { content, toolCalls, model, usage };
  }
}

function toWire(m: LlmMessage) {
  switch (m.role) {
    case 'tool':
      return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
    case 'assistant':
      return {
        role: 'assistant',
        content: m.content,
        ...(m.toolCalls?.length
          ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } })) }
          : {}),
      };
    default:
      return { role: m.role, content: m.content };
  }
}
