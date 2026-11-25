import { describe, expect, it } from 'vitest';
import { PRODUCTS } from './catalog.data';
import { CatalogService, FREE_SHIPPING_FROM, tokenize } from './catalog.service';

const catalog = new CatalogService();
const names = (q: ProductQuery) => catalog.search(q).map((p) => p.name);
type ProductQuery = Parameters<CatalogService['search']>[0];

describe('catalog data', () => {
  it('has unique ids and names, and names match the items in the sample orders', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.name)).size).toBe(PRODUCTS.length);
    // These are the item names seeded into every account's sample orders (order.service.ts).
    for (const orderItem of ['boAt Airdopes 141 Earbuds', 'USB-C Charging Cable 1m', 'Mi Power Bank 20000mAh', 'Logitech M331 Silent Mouse', 'Noise ColorFit Smartwatch']) {
      expect(PRODUCTS.map((p) => p.name)).toContain(orderItem);
    }
  });

  it('every product is complete', () => {
    for (const p of PRODUCTS) {
      expect(p.price).toBeGreaterThan(0);
      expect(p.features.length).toBeGreaterThanOrEqual(3);
      expect(p.description.length).toBeGreaterThan(30);
      expect(p.warranty).toMatch(/year|month/);
    }
  });
});

describe('free shipping flag', () => {
  it(`is true from ₹${FREE_SHIPPING_FROM}, matching the shipping policy`, () => {
    const byName = Object.fromEntries(catalog.list().map((p) => [p.name, p.freeShipping]));
    expect(byName['boAt Airdopes 141 Earbuds']).toBe(true);
    expect(byName['USB-C Charging Cable 1m']).toBe(false); // ₹299
  });
});

describe('tokenize', () => {
  it('drops filler words and folds plurals', () => {
    expect(tokenize('Tell me about the earbuds under ₹2,000, please')).toEqual(['earbud', '2', '000']);
    expect(tokenize('Power Banks')).toEqual(['power', 'bank']);
  });
});

describe('search', () => {
  it('a question that names one product returns only that product', () => {
    expect(names({ query: 'Tell me about the boAt Airdopes 141 Earbuds' })).toEqual(['boAt Airdopes 141 Earbuds']);
    expect(names({ query: 'tell me about the Mi Power Bank 20000mAh' })).toEqual(['Mi Power Bank 20000mAh']);
  });

  it('finds products by category, singular or plural', () => {
    expect(names({ query: 'earbuds' })[0]).toBe('boAt Airdopes 141 Earbuds');
    expect(names({ query: 'which power bank do you have?' })[0]).toBe('Mi Power Bank 20000mAh');
    expect(names({ query: 'smartwatch' })).toEqual(['Noise ColorFit Smartwatch']);
    expect(names({ query: 'a speaker' })).toEqual(['Mini Bluetooth Speaker 10W']);
  });

  it('finds products by what they do', () => {
    expect(names({ query: 'something with noise cancellation' })[0]).toBe('boAt Airdopes 141 Earbuds');
    expect(names({ query: 'a quiet mouse' })[0]).toBe('Logitech M331 Silent Mouse');
  });

  it('applies a budget', () => {
    const cheap = names({ maxPrice: 1000 });
    expect(cheap).toEqual(expect.arrayContaining(['Logitech M331 Silent Mouse', 'USB-C Charging Cable 1m']));
    expect(cheap).not.toContain('Noise ColorFit Smartwatch');
    expect(names({ query: 'earbuds', maxPrice: 1000 })).toEqual([]); // the earbuds cost ₹1,499
    expect(names({ query: 'earbuds', maxPrice: 2000 })).toEqual(['boAt Airdopes 141 Earbuds']);
  });

  it('returns nothing for products we do not sell, and respects the limit', () => {
    expect(names({ query: 'gaming laptop' })).toEqual([]);
    expect(names({ query: 'who won the cricket world cup' })).toEqual([]);
    expect(catalog.search({ limit: 2 })).toHaveLength(2);
    expect(catalog.search({})).toHaveLength(4); // default limit
  });
});
