import type { Response } from 'express';
import type { SseEvent } from '@shared';

export interface SseWriter {
  send(event: SseEvent): void;
  end(): void;
}

/** Opens a Server-Sent Events stream. Headers are flushed immediately so proxies don't buffer. */
export function openSse(res: Response): SseWriter {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  return {
    send(e) {
      if (res.writableEnded || res.destroyed) return;
      res.write(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
    },
    end() {
      if (!res.writableEnded) res.end();
    },
  };
}
