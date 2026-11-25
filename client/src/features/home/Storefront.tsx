import { memo } from 'react';
import { HelpSection } from './HelpSection';
import { Hero } from './Hero';
import { Highlights } from './Highlights';
import { OrdersSection } from './OrdersSection';
import { ProductGrid } from './ProductGrid';
import { TopNav } from './TopNav';
import type { useOrders } from './useOrders';
import type { useProducts } from './useProducts';

interface Props {
  userName: string;
  firstName: string;
  orders: ReturnType<typeof useOrders>;
  catalog: ReturnType<typeof useProducts>;
  onAsk(text: string): void;
  onLogout(): void;
}

/**
 * The left column of the home page. Memoized: the assistant on the right re-renders for every streamed
 * frame, and none of that should touch the storefront. Every prop must therefore be referentially stable
 * (memoized hook results, useCallback handlers), which HomePage guarantees.
 */
export const Storefront = memo(function Storefront({ userName, firstName, orders, catalog, onAsk, onLogout }: Props) {
  return (
    <div className="scroll-thin flex min-w-0 flex-1 flex-col overflow-y-auto">
      <TopNav userName={userName} onLogout={onLogout} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-6 sm:px-6 sm:py-8">
        <Hero firstName={firstName} onAsk={onAsk} />
        <Highlights onAsk={onAsk} />
        <OrdersSection orders={orders} onAsk={onAsk} />
        <ProductGrid catalog={catalog} onAsk={onAsk} />
        <HelpSection onAsk={onAsk} />
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">Shoplens is a demo store. Prices in ₹. Answers come from our policy documents.</footer>
    </div>
  );
});
