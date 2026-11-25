import type { ProductDto } from '@shared';
import { PRODUCTS, type Product } from './catalog.data';

/** Free shipping starts at this order value (see server/kb/shipping.md). */
export const FREE_SHIPPING_FROM = 499;

export const toProductDto = (p: Product): ProductDto => ({ ...p, freeShipping: p.price >= FREE_SHIPPING_FROM });

const STOPWORDS = new Set(
  'a an and any are as at be can could do does for from get give have how i in is it its me my of on or our please show some tell than that the there this to under below above upto up us want what which with you your about like need looking find buy price cost much rs inr something anything'.split(' '),
);

/** Lowercases, drops punctuation and stopwords, and folds simple plurals ("earbuds" and "earbud" match). */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => !STOPWORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

export interface ProductSearch {
  query?: string;
  maxPrice?: number;
  limit?: number;
}

export class CatalogService {
  constructor(private readonly products: Product[] = PRODUCTS) {}

  list(): ProductDto[] {
    return this.products.map(toProductDto);
  }

  /**
   * Ranks products against free text: matches in the name count most, then the category, then the
   * description and features. A query that names one product exactly returns just that product.
   */
  search({ query = '', maxPrice, limit = 4 }: ProductSearch = {}): ProductDto[] {
    const pool = this.products.filter((p) => maxPrice === undefined || p.price <= maxPrice);
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return pool.slice(0, limit).map(toProductDto);

    const normalizedQuery = queryTokens.join(' ');
    const bigrams = queryTokens.slice(1).map((t, i) => `${queryTokens[i]} ${t}`);
    const scored = pool
      .map((p) => {
        const name = tokenize(p.name);
        const category = tokenize(p.category);
        const restTokens = tokenize([p.tagline, p.description, ...p.features].join(' '));
        const rest = new Set(restTokens);
        const restText = restTokens.join(' ');
        let score = 0;
        let matched = 0;
        for (const t of queryTokens) {
          const points = name.includes(t) ? 3 : category.includes(t) ? 2 : rest.has(t) ? 1 : 0;
          if (points > 0) matched++;
          score += points;
        }
        // Two query words side by side in the product text ("noise cancellation") is a much stronger signal.
        for (const b of bigrams) if (restText.includes(b)) score += 4;
        const exactName = normalizedQuery.includes(name.join(' '));
        // A product must explain most of what was asked: "gaming laptop" must not return earbuds just
        // because their description mentions gaming.
        const coverage = matched / queryTokens.length;
        return { p, score: exactName ? score + 100 : score, exactName, ok: exactName || coverage >= 0.6 };
      })
      .filter((s) => s.score > 0 && s.ok)
      .sort((a, b) => b.score - a.score);

    const exact = scored.find((s) => s.exactName);
    return (exact ? [exact] : scored).slice(0, limit).map((s) => toProductDto(s.p));
  }
}
