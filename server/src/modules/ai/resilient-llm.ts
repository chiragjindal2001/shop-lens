import { LlmError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type { LlmChatRequest, LlmChatResponse, LlmClient } from './llm-client';

export interface ResilientOptions {
  /** Max silence before a request is cancelled (resets whenever a token arrives). */
  timeoutMs: number;
  /** Retries after the first attempt, on 429 / 5xx / timeouts / network errors. */
  retries: number;
  baseDelayMs: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export const DEFAULT_RESILIENCE: ResilientOptions = { timeoutMs: 30_000, retries: 2, baseDelayMs: 500 };

const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true });
  });

const isRetryableStatus = (s?: number) => s === 429 || (s !== undefined && s >= 500);

/**
 * Wraps any LlmClient with a per-request timeout (AbortController), retries with exponential backoff
 * on 429/5xx, and never retries 4xx validation errors. Model fallback is delegated to OpenRouter's
 * `models` array inside the concrete client. A retry is only safe before any token has been streamed.
 */
export class ResilientLlm implements LlmClient {
  constructor(
    private readonly inner: LlmClient,
    private readonly opts: ResilientOptions = DEFAULT_RESILIENCE,
  ) {}

  chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    return this.run(req.signal, (signal, touch) =>
      this.inner.chat({
        ...req,
        signal,
        onToken: (t) => {
          touch();
          req.onToken?.(t);
        },
      }),
    );
  }

  embed(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    return this.run(signal, (s) => this.inner.embed(texts, s));
  }

  private async run<T>(
    callerSignal: AbortSignal | undefined,
    call: (signal: AbortSignal, touch: () => void) => Promise<T>,
  ): Promise<T> {
    const sleep = this.opts.sleep ?? defaultSleep;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.opts.retries; attempt++) {
      if (callerSignal?.aborted) throw new LlmError('Request aborted');
      const timeout = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let timedOut = false;
      let emitted = false;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => ((timedOut = true), timeout.abort()), this.opts.timeoutMs);
      };
      const onCallerAbort = () => timeout.abort();
      callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
      arm();

      try {
        return await call(timeout.signal, () => {
          emitted = true;
          arm();
        });
      } catch (err) {
        lastError = err;
        if (callerSignal?.aborted) throw err; // the caller cancelled: no retry
        const failure = timedOut ? new LlmError('The model took too long to respond', undefined, true) : err;
        const retryable = failure instanceof LlmError && (failure.retryable || isRetryableStatus(failure.status));
        if (!retryable || emitted || attempt === this.opts.retries) throw failure;
        const delay = this.opts.baseDelayMs * 2 ** attempt;
        logger.warn({ attempt: attempt + 1, delay, err: String(failure) }, 'llm retry');
        await sleep(delay, callerSignal);
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener('abort', onCallerAbort);
      }
    }
    throw lastError;
  }
}
