import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Container } from './container';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createRateLimiters } from './middleware/rate-limit';
import { requestId } from './middleware/request-id';
import { requireAuth } from './middleware/require-auth';
import { AuthController } from './modules/auth/auth.controller';
import { authRoutes } from './modules/auth/auth.routes';
import { ChatController } from './modules/chat/chat.controller';
import { chatRoutes } from './modules/chat/chat.routes';
import { mountDocs } from './openapi/swagger-ui';
import { CatalogController } from './modules/catalog/catalog.controller';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { OrdersController } from './modules/orders/orders.controller';
import { ordersRoutes } from './modules/orders/orders.routes';
import { mountStatic } from './static';

/** Builds the Express app from the container. It never calls listen(), so tests can use it directly. */
export function createApp(c: Container): Express {
  const { config } = c;
  const isProd = config.NODE_ENV === 'production';
  const app = express();

  app.set('trust proxy', config.TRUST_PROXY);
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());

  const limiters = createRateLimiters(config.rateLimits);
  const mw = { ...limiters, requireAuth: requireAuth(c.tokens) };

  const api = express.Router();
  api.get('/health', async (_req, res) => {
    const db = await c.health();
    res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
  });
  api.use('/auth', authRoutes(new AuthController(c.auth, config.COOKIE_SECURE ?? isProd, config.refreshTokenTtlSeconds), mw));
  api.use('/chat', chatRoutes(new ChatController(c.chat), mw));
  api.use('/orders', ordersRoutes(new OrdersController(c.orders), mw));
  api.use('/products', catalogRoutes(new CatalogController(c.catalog), mw));
  api.use(notFoundHandler);
  if (config.docsEnabled) mountDocs(app); // Swagger UI + OpenAPI JSON, before the /api router's 404
  app.use('/api', api);

  mountStatic(app, config.CLIENT_DIST);
  app.use(errorHandler(isProd));
  return app;
}
