import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ValidationError } from '../lib/errors';

/** Parses req.body with a zod schema; the parsed (trimmed/normalised) value replaces it. */
export const validateBody =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
      return next(new ValidationError('Please check the highlighted fields', fields));
    }
    req.body = result.data;
    next();
  };
