import type { SseEvent } from '@shared';

/**
 * Incremental Server-Sent Events parser. We can't use EventSource: it only supports GET and
 * cannot send an Authorization header, so /chat/send is read with fetch + a stream reader.
 */
export function createSseParser(onEvent: (e: SseEvent) => void) {
  let buffer = '';
  return {
    feed(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n');
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        let event = 'message';
        const data: string[] = [];
        for (const line of frame.split('\n')) {
          if (line.startsWith(':')) continue;
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        }
        if (!data.length) continue;
        try {
          onEvent({ event, data: JSON.parse(data.join('\n')) } as SseEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    },
  };
}
