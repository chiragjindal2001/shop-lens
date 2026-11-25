import type { Request, Response } from 'express';
import type { AuthResult, AuthService } from './auth.service';

export const REFRESH_COOKIE = 'refresh_token';

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly secureCookies: boolean,
    /** Cookie lifetime = refresh token lifetime (REFRESH_TOKEN_TTL). */
    private readonly refreshTtlSeconds: number,
  ) {}

  signup = async (req: Request, res: Response) => {
    res.status(201).json(this.respond(res, await this.auth.signup(req.body)));
  };

  login = async (req: Request, res: Response) => {
    res.json(this.respond(res, await this.auth.login(req.body)));
  };

  refresh = async (req: Request, res: Response) => {
    res.json(this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE])));
  };

  logout = async (req: Request, res: Response) => {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    res.status(204).end();
  };

  me = async (req: Request, res: Response) => {
    res.json({ user: await this.auth.me(req.user!.id) });
  };

  private respond(res: Response, result: AuthResult) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      maxAge: this.refreshTtlSeconds * 1000,
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  private cookieOptions() {
    return { httpOnly: true, secure: this.secureCookies, sameSite: 'lax' as const, path: '/api/auth' };
  }
}
