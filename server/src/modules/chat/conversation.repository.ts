import type { Page } from '../../lib/pagination';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationRepository {
  create(userId: string, title: string): Promise<Conversation>;
  findById(userId: string, id: string): Promise<Conversation | null>;
  listByUser(userId: string, opts: { cursor?: string; limit: number }): Promise<Page<Conversation>>;
  touch(userId: string, id: string): Promise<void>;
  delete(userId: string, id: string): Promise<boolean>;
}
