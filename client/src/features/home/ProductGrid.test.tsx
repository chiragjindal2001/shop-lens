import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ProductDto } from '@shared';
import { askAboutProduct, ProductGrid, productImage } from './ProductGrid';

const product = (over: Partial<ProductDto>): ProductDto => ({
  id: 'p1',
  name: 'boAt Airdopes 141 Earbuds',
  category: 'Earbuds',
  tagline: '42-hour playback with ENx noise cancellation.',
  description: 'True wireless earbuds…',
  price: 1499,
  features: ['Bluetooth 5.1'],
  warranty: '1 year',
  freeShipping: true,
  ...over,
});

const state = (products: ProductDto[], over = {}) => ({ products, loading: false, error: false, reload: vi.fn(), ...over });

describe('ProductGrid', () => {
  it('renders each product from the catalog with its price and free-shipping badge', () => {
    render(
      <ProductGrid
        onAsk={vi.fn()}
        catalog={state([product({}), product({ id: 'p2', name: 'USB-C Charging Cable 1m', category: 'Cables & chargers', price: 299, freeShipping: false })])}
      />,
    );
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByText('₹1,499')).toBeInTheDocument();
    expect(within(cards[0]!).getByText('Free shipping')).toBeInTheDocument();
    expect(within(cards[1]!).getByText('₹299')).toBeInTheDocument();
    expect(within(cards[1]!).queryByText('Free shipping')).not.toBeInTheDocument();
  });

  it('"Ask about this" asks the assistant to describe THAT product (not a generic policy question)', async () => {
    const onAsk = vi.fn();
    render(<ProductGrid onAsk={onAsk} catalog={state([product({})])} />);
    await userEvent.click(screen.getByRole('button', { name: /Ask about this/ }));
    expect(onAsk).toHaveBeenCalledExactlyOnceWith('Tell me about the boAt Airdopes 141 Earbuds');
    expect(askAboutProduct({ name: 'Mi Power Bank 20000mAh' })).toBe('Tell me about the Mi Power Bank 20000mAh');
  });

  it('shows skeletons while loading, and a retry when the catalog fails to load', async () => {
    const { rerender } = render(<ProductGrid onAsk={vi.fn()} catalog={state([], { loading: true })} />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    const reload = vi.fn();
    rerender(<ProductGrid onAsk={vi.fn()} catalog={state([], { error: true, reload })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe('product pictures', () => {
  it('shows the product picture with the product name as its alt text', () => {
    render(<ProductGrid onAsk={vi.fn()} catalog={state([product({})])} />);
    const img = screen.getByRole('img', { name: 'boAt Airdopes 141 Earbuds' });
    expect(img).toHaveAttribute('src', '/products/p1.svg');
  });

  it('falls back to the category icon when the picture cannot load', () => {
    render(<ProductGrid onAsk={vi.fn()} catalog={state([product({})])} />);
    fireEvent.error(screen.getByRole('img', { name: 'boAt Airdopes 141 Earbuds' }));
    expect(screen.queryByRole('img', { name: 'boAt Airdopes 141 Earbuds' })).not.toBeInTheDocument();
  });

  it('every product in the server catalog has an illustration file', () => {
    const data = readFileSync(path.resolve(__dirname, '../../../../server/src/modules/catalog/catalog.data.ts'), 'utf8');
    const ids = [...data.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1]!);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) expect(existsSync(path.resolve(__dirname, '../../../public', productImage({ id }).slice(1))), id).toBe(true);
  });
});
