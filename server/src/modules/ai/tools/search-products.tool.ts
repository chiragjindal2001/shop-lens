import { z } from 'zod';
import type { CatalogService } from '../../catalog/catalog.service';
import { FREE_SHIPPING_FROM } from '../../catalog/catalog.service';
import { defineTool } from './tool.types';

export const searchProductsTool = (catalog: CatalogService) =>
  defineTool({
    name: 'search_products',
    description:
      'Look up Shoplens products: what a product is, its price, key features and warranty. Use for "tell me about <product>", comparisons, "what earbuds do you have", and budget questions like "earbuds under ₹2,000". Pass the product name or what the customer is looking for.',
    statusLabel: 'Looking up the product…',
    schema: z.object({
      query: z.string().trim().max(200).optional(),
      maxPrice: z.number().positive().optional(),
    }),
    async run({ query, maxPrice }, ctx) {
      const found = catalog.search({ query, maxPrice, limit: 4 });
      if (found.length === 0) {
        return { products: [], note: 'No matching product in the catalog. Say so, and offer to help with something else or create a support ticket.' };
      }
      ctx.addSources(found.map((p) => ({ source: 'Product catalog', section: p.name })));
      return {
        products: found.map((p) => ({
          name: p.name,
          category: p.category,
          priceInr: p.price,
          description: p.description,
          features: p.features,
          warranty: p.warranty,
          shipping: p.freeShipping ? 'Free shipping' : `Free shipping from ₹${FREE_SHIPPING_FROM}; a ₹49 fee applies below that`,
        })),
      };
    },
  });
