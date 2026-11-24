import pino from 'pino';
import { currentRequestId } from './request-context';

const env = process.env.NODE_ENV ?? 'development';

export const logger = pino({
  level: env === 'test' ? 'silent' : env === 'production' ? 'info' : 'debug',
  mixin: () => ({ requestId: currentRequestId() }),
  ...(env === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } } }
    : {}),
});
