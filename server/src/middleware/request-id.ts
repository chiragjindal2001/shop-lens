import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../lib/logger';
import { requestContext } from '../lib/request-context';

/** Puts a request id in AsyncLocalStorage (so every log line has it) and in X-Request-Id. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[\w-]{6,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  requestContext.run({ requestId: id }, () => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({ method: req.method, url: req.originalUrl.split('?')[0], status: res.statusCode, ms: Date.now() - start }, 'request');
    });
    next();
  });
};
