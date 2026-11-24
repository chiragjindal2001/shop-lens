import { existsSync } from 'node:fs';
import { bootstrap } from '../bootstrap';
import { loadConfig } from '../config/env';
import { buildContainer } from '../container';
import { connectMongo, disconnectMongo } from '../infra/mongo/connection';

if (existsSync('.env')) process.loadEnvFile('.env');

const config = loadConfig();
await connectMongo(config.mongoUri);
await bootstrap(buildContainer(config));
await disconnectMongo();
