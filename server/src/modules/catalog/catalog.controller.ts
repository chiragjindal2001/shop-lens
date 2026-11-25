import type { Request, Response } from 'express';
import type { ProductsResponse } from '@shared';
import type { CatalogService } from './catalog.service';

export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  list = async (_req: Request, res: Response) => {
    // The catalog is static data, so the browser may reuse it for a few minutes (private: it is behind login).
    res.setHeader('Cache-Control', 'private, max-age=300');
    const body: ProductsResponse = { products: this.catalog.list() };
    res.json(body);
  };
}
