import { ConversationModel } from './conversation.mongo';
import { KbChunkModel } from './kb-chunk.mongo';
import { MessageModel } from './message.mongo';
import { OrderModel } from './order.mongo';
import { ReturnRequestModel } from './return-request.mongo';
import { SessionModel } from './session.mongo';
import { TicketModel } from './ticket.mongo';
import { UserModel } from './user.mongo';

/** Creates every declared index if missing. The Atlas vector index is created by AtlasKnowledgeStore.ensureVectorIndex(). */
export async function ensureIndexes(): Promise<void> {
  await Promise.all(
    [UserModel, SessionModel, ConversationModel, MessageModel, OrderModel, ReturnRequestModel, TicketModel, KbChunkModel].map(
      (m) => m.createIndexes(),
    ),
  );
}
