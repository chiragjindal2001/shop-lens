import type { SessionRepository } from '../../modules/auth/session.repository';
import type { UserRepository } from '../../modules/auth/user.repository';
import type { ConversationRepository } from '../../modules/chat/conversation.repository';
import type { MessageRepository } from '../../modules/chat/message.repository';
import type { OrderRepository } from '../../modules/orders/order.repository';
import type { ReturnRequestRepository } from '../../modules/orders/return-request.repository';
import type { TicketRepository } from '../../modules/tickets/ticket.repository';
import type { KnowledgeStore } from '../../modules/knowledge/knowledge-store';
import { AtlasKnowledgeStore } from './atlas-knowledge-store';
import { MongoConversationRepository } from './conversation.mongo';
import { MongoMessageRepository } from './message.mongo';
import { MongoOrderRepository } from './order.mongo';
import { MongoReturnRequestRepository } from './return-request.mongo';
import { MongoSessionRepository } from './session.mongo';
import { MongoTicketRepository } from './ticket.mongo';
import { MongoUserRepository } from './user.mongo';

export interface Repositories {
  users: UserRepository;
  sessions: SessionRepository;
  conversations: ConversationRepository;
  messages: MessageRepository;
  orders: OrderRepository;
  returns: ReturnRequestRepository;
  tickets: TicketRepository;
  knowledge: KnowledgeStore & { ensureVectorIndex?(attempts?: number, delayMs?: number): Promise<void> };
}

export function createMongoRepositories(opts: { embeddingDimensions?: number } = {}): Repositories {
  return {
    users: new MongoUserRepository(),
    sessions: new MongoSessionRepository(),
    conversations: new MongoConversationRepository(),
    messages: new MongoMessageRepository(),
    orders: new MongoOrderRepository(),
    returns: new MongoReturnRequestRepository(),
    tickets: new MongoTicketRepository(),
    knowledge: new AtlasKnowledgeStore(opts.embeddingDimensions),
  };
}
