import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../lib/errors';

export const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60;
export const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface RefreshClaims {
  userId: string;
  sessionId: string;
}

export class TokenService {
  /** Configurable through ACCESS_TOKEN_TTL / REFRESH_TOKEN_TTL (see config/env.ts). */
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;

  constructor(
    private readonly secrets: { access: string; refresh: string },
    ttl: { accessSeconds?: number; refreshSeconds?: number } = {},
  ) {
    this.accessTtlSeconds = ttl.accessSeconds ?? DEFAULT_ACCESS_TTL_SECONDS;
    this.refreshTtlSeconds = ttl.refreshSeconds ?? DEFAULT_REFRESH_TTL_SECONDS;
  }

  signAccess(userId: string): string {
    return jwt.sign({}, this.secrets.access, {
      subject: userId,
      expiresIn: this.accessTtlSeconds,
      algorithm: 'HS256',
    });
  }

  verifyAccess(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.secrets.access, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || !payload.sub) throw new Error('no subject');
      return { userId: payload.sub };
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /** A fresh `jti` makes every rotated refresh token (and so its hash) unique. */
  signRefresh(userId: string, sessionId: string): string {
    return jwt.sign({ sid: sessionId }, this.secrets.refresh, {
      subject: userId,
      expiresIn: this.refreshTtlSeconds,
      algorithm: 'HS256',
      jwtid: randomUUID(),
    });
  }

  verifyRefresh(token: string): RefreshClaims {
    try {
      const payload = jwt.verify(token, this.secrets.refresh, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || !payload.sub || typeof payload.sid !== 'string') {
        throw new Error('bad claims');
      }
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      throw new UnauthorizedError('Invalid or expired session');
    }
  }

  /** Only a hash of the refresh token is ever stored. */
  hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
