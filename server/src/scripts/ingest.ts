import { existsSync } from 'node:fs';
import { loadConfig } from '../config/env';
import { buildContainer } from '../container';
import { connectMongo, disconnectMongo } from '../infra/mongo/connection';
import { ensureIndexes } from '../infra/mongo/indexes';

if (existsSync('.env')) process.loadEnvFile('.env');

/** Re-ingests server/kb/*.md: run once per knowledge-base change, never per request. */
const config = loadConfig();
await connectMongo(config.mongoUri);
await ensureIndexes();
const container = buildContainer(config);
await container.knowledge.ensureVectorIndex?.();
const chunks = await container.ingest.ingest();
console.log(`Ingested ${chunks} chunks`);
await disconnectMongo();
