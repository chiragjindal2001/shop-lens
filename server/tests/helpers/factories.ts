import request from 'supertest';
import type { Express } from 'express';
import type { SseEvent } from '@shared';

let n = 0;
export const uniqueEmail = () => `user${++n}-${Date.now()}@example.com`;

export interface TestUser {
  email: string;
  password: string;
  token: string;
  id: string;
  cookie: string;
}

export async function signup(app: Express, over: Partial<{ name: string; email: string; password: string }> = {}): Promise<TestUser> {
  const body = { name: 'Test User', email: uniqueEmail(), password: 'Passw0rd!x', ...over };
  const res = await request(app).post('/api/auth/signup').send(body).expect(201);
  const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  return { email: body.email.toLowerCase(), password: body.password, token: res.body.accessToken, id: res.body.user.id, cookie };
}

export const auth = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });

export function parseSse(text: string): SseEvent[] {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((frame) => {
      const event = /^event: (.+)$/m.exec(frame)![1]!;
      const data = JSON.parse(/^data: (.+)$/m.exec(frame)![1]!);
      return { event, data } as SseEvent;
    });
}

export async function sendChat(
  app: Express,
  user: TestUser,
  message: string,
  extra: Partial<{ conversationId: string; idempotencyKey: string }> = {},
) {
  const res = await request(app)
    .post('/api/chat/send')
    .set(auth(user))
    .send({ message, idempotencyKey: extra.idempotencyKey ?? crypto.randomUUID(), conversationId: extra.conversationId });
  return { res, events: res.status === 200 ? parseSse(res.text) : [] };
}

export const tokensText = (events: SseEvent[]) =>
  events.flatMap((e) => (e.event === 'token' ? [e.data.text] : [])).join('');
