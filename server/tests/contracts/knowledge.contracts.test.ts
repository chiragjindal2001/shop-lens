import { afterAll, beforeAll, beforeEach } from 'vitest';
import { MemoryKnowledgeStore } from '../../src/infra/memory-knowledge-store';
import { startTestEnv, type TestEnv } from '../helpers/test-container';
import { knowledgeStoreContract } from './knowledge.contract';

let env: TestEnv;
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());
beforeEach(() => env.clear());

// In-memory cosine store...
knowledgeStoreContract(() => new MemoryKnowledgeStore());
// ...and the Atlas store, which on mongodb-memory-server takes its in-memory fallback path
// ($vectorSearch itself can only be checked against a real Atlas / atlas-local deployment).
knowledgeStoreContract(() => env.repos.knowledge);
