import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new NotFoundError('Route not found'));

export const errorHandler =
  (isProd: boolean): ErrorRequestHandler =>
  (err, _req, res, _next) => {
    if (res.headersSent) {
      res.end();
      return;
    }
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } });
      return;
    }
    // body-parser errors carry a status (413 too large, 400 malformed JSON)
    const status = typeof err?.status === 'number' ? err.status : undefined;
    if (status && status >= 400 && status < 500) {
      res.status(status).json({ error: { code: 'BAD_REQUEST', message: status === 413 ? 'Request body too large' : 'Malformed request' } });
      return;
    }
    logger.error({ err }, 'unhandled error');
    res.status(500).json({
      error: { code: 'INTERNAL', message: 'Something went wrong', ...(isProd ? {} : { detail: String(err?.stack ?? err) }) },
    });
  };
