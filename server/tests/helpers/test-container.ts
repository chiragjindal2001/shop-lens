import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { loadConfig, type Config } from '../../src/config/env';
import { buildContainer, type Container } from '../../src/container';
import { connectMongo, disconnectMongo, pingMongo } from '../../src/infra/mongo/connection';
import { createMongoRepositories, type Repositories } from '../../src/infra/mongo';
import { ensureIndexes } from '../../src/infra/mongo/indexes';
import { MockLlmClient } from '../../src/infra/llm/mock-client';
import type { LlmClient } from '../../src/modules/ai/llm-client';

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    MONGO_HOST: 'unused',
    MONGO_DB_NAME: 'test',
    JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-1234',
    JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-12',
    LLM_PROVIDER: 'mock',
    BCRYPT_COST: '4',
    ...overrides,
  });
}

export interface TestEnv {
  repos: Repositories;
  container: Container;
  app: ReturnType<typeof createApp>;
  clear(): Promise<void>;
  stop(): Promise<void>;
}

let mongod: MongoMemoryServer | undefined;

/** Mongo adapters on mongodb-memory-server + the mock LLM (no network, no API key). */
export async function startTestEnv(opts: { llm?: LlmClient; config?: Partial<Config> } = {}): Promise<TestEnv> {
  mongod = await MongoMemoryServer.create();
  await connectMongo(mongod.getUri());
  await ensureIndexes();
  const repos = createMongoRepositories();
  const base = testConfig();
  // Generous limits so tests don't trip them; rate-limit tests build their own tight config.
  const config = {
    ...base,
    rateLimits: { auth: { windowMs: 60_000, limit: 10_000 }, chat: { windowMs: 60_000, limit: 10_000 } },
    ...opts.config,
  } as Config;
  const container = buildContainer(config, { repos, llm: opts.llm ?? new MockLlmClient(), health: pingMongo });
  return {
    repos,
    container,
    app: createApp(container),
    async clear() {
      const cols = await mongoose.connection.db!.collections();
      await Promise.all(cols.map((c) => c.deleteMany({})));
    },
    async stop() {
      await disconnectMongo();
      await mongod?.stop();
    },
  };
}
