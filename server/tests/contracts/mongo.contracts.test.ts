import { afterAll, beforeAll, beforeEach } from 'vitest';
import { startTestEnv, type TestEnv } from '../helpers/test-container';
import { conversationRepositoryContract } from './conversation.contract';
import { messageRepositoryContract } from './message.contract';
import { orderRepositoryContract } from './order.contract';
import { returnRequestRepositoryContract, ticketRepositoryContract } from './return-and-ticket.contract';
import { sessionRepositoryContract } from './session.contract';
import { userRepositoryContract } from './user.contract';

// Any future adapter (e.g. Postgres) must pass these same suites: build its Repositories here.
let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());
beforeEach(() => env.clear());

userRepositoryContract(() => env.repos.users);
sessionRepositoryContract(() => env.repos.sessions);
conversationRepositoryContract(() => env.repos.conversations);
messageRepositoryContract(() => env.repos.messages);
orderRepositoryContract(() => env.repos.orders);
returnRequestRepositoryContract(() => env.repos.returns);
ticketRepositoryContract(() => env.repos.tickets);
