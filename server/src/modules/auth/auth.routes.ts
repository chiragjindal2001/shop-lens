import { Router, type RequestHandler } from 'express';
import { loginSchema, signupSchema } from '@shared';
import { validateBody } from '../../middleware/validate';
import type { AuthController } from './auth.controller';

export function authRoutes(c: AuthController, mw: { authLimiter: RequestHandler; requireAuth: RequestHandler }) {
  const r = Router();
  r.post('/signup', mw.authLimiter, validateBody(signupSchema), c.signup);
  r.post('/login', mw.authLimiter, validateBody(loginSchema), c.login);
  r.post('/refresh', c.refresh);
  r.post('/logout', c.logout);
  r.get('/me', mw.requireAuth, c.me);
  return r;
}
