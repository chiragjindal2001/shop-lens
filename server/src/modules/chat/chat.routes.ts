import { Router, type RequestHandler } from 'express';
import { sendMessageSchema } from '@shared';
import { validateBody } from '../../middleware/validate';
import type { ChatController } from './chat.controller';

export function chatRoutes(c: ChatController, mw: { requireAuth: RequestHandler; chatLimiter: RequestHandler }) {
  const r = Router();
  r.use(mw.requireAuth);
  r.post('/send', mw.chatLimiter, validateBody(sendMessageSchema), c.send);
  r.get('/history', c.history);
  r.get('/history/:conversationId', c.conversation);
  r.delete('/history/:conversationId', c.remove);
  return r;
}
