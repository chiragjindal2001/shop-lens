import { Router, type RequestHandler } from 'express';
import type { CatalogController } from './catalog.controller';

export function catalogRoutes(c: CatalogController, mw: { requireAuth: RequestHandler }) {
  const r = Router();
  r.use(mw.requireAuth);
  r.get('/', c.list);
  return r;
}
