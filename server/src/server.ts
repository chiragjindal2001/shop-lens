import { existsSync } from 'node:fs';
import { createApp } from './app';
import { bootstrap } from './bootstrap';
import { loadConfig } from './config/env';
import { buildContainer } from './container';
import { connectMongo, disconnectMongo } from './infra/mongo/connection';
import { logger } from './lib/logger';

if (existsSync('.env')) process.loadEnvFile('.env');

async function main() {
  const config = loadConfig(); // fails fast on bad env
  await connectMongo(config.mongoUri);
  const container = buildContainer(config);
  await bootstrap(container);

  const app = createApp(container);
  const server = app.listen(config.PORT, () => logger.info({ port: config.PORT, env: config.NODE_ENV }, 'server listening'));

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
