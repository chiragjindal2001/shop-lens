import { Router, type RequestHandler } from 'express';
import type { OrdersController } from './orders.controller';

export function ordersRoutes(c: OrdersController, mw: { requireAuth: RequestHandler }) {
  const r = Router();
  r.use(mw.requireAuth);
  r.get('/', c.list);
  return r;
}
