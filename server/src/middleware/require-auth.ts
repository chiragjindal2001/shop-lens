import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../lib/errors';
import type { TokenService } from '../modules/auth/token.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const requireAuth =
  (tokens: TokenService): RequestHandler =>
  (req, _res, next) => {
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return next(new UnauthorizedError());
    req.user = { id: tokens.verifyAccess(token).userId };
    next();
  };
