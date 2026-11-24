import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Config } from '../config/env';

const tooMany = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again shortly.' },
};

/** Default memory store: fine for one instance. For several, swap in rate-limit-redis. */
export function createRateLimiters(cfg: Config['rateLimits']): { authLimiter: RequestHandler; chatLimiter: RequestHandler } {
  const common = { standardHeaders: 'draft-7' as const, legacyHeaders: false, message: tooMany };
  return {
    authLimiter: rateLimit({
      ...common,
      windowMs: cfg.auth.windowMs,
      limit: cfg.auth.limit,
      keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    }),
    // Keyed by user so one account can't burn the LLM quota and shared office IPs aren't punished.
    chatLimiter: rateLimit({
      ...common,
      windowMs: cfg.chat.windowMs,
      limit: cfg.chat.limit,
      keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
    }),
  };
}
