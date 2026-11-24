import type { Request, Response } from 'express';
import { historyQuerySchema } from '@shared';
import { ValidationError } from '../../lib/errors';
import type { ChatService } from './chat.service';
import { openSse } from './sse';

export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** Opens an SSE stream (after pre-checks) and aborts the LLM call if the client disconnects. */
  send = async (req: Request, res: Response) => {
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort();
    });
    await this.chat.send(req.user!.id, req.body, () => openSse(res), abort.signal);
  };

  history = async (req: Request, res: Response) => {
    const q = historyQuerySchema.safeParse(req.query);
    if (!q.success) throw new ValidationError('Invalid query');
    res.json(await this.chat.listConversations(req.user!.id, q.data));
  };

  conversation = async (req: Request, res: Response) => {
    res.json(await this.chat.getConversation(req.user!.id, String(req.params.conversationId)));
  };

  remove = async (req: Request, res: Response) => {
    await this.chat.deleteConversation(req.user!.id, String(req.params.conversationId));
    res.status(204).end();
  };
}
