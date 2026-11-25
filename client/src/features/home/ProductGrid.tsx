import { memo, useState } from 'react';
import type { ProductDto } from '@shared';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { tip } from '../../lib/tip';
import { formatINR } from './catalog';
import type { useProducts } from './useProducts';

const ICON_BY_CATEGORY: Record<string, IconName> = {
  Earbuds: 'headphones',
  'Power banks': 'battery',
  Smartwatches: 'watch',
  'Mouse & keyboards': 'mouse',
  Speakers: 'speaker',
  'Cables & chargers': 'cable',
};

/** What "Ask about this" sends: the assistant describes the product, then the customer can ask for details. */
export const askAboutProduct = (p: Pick<ProductDto, 'name'>) => `Tell me about the ${p.name}`;

/** Illustrations live in public/products/<product id>.svg; a product without one falls back to its category icon. */
export const productImage = (p: Pick<ProductDto, 'id'>) => `/products/${p.id}.svg`;

const ProductCard = memo(function ProductCard({ product: p, onAsk }: { product: ProductDto; onAsk(text: string): void }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="shadow-card group flex flex-col rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="bg-brand-soft relative grid aspect-8/5 place-items-center overflow-hidden rounded-xl text-brand">
        {imageFailed ? (
          <Icon name={ICON_BY_CATEGORY[p.category] ?? 'package'} size={44} strokeWidth={1.4} />
        ) : (
          <img src={productImage(p)} alt={p.name} width={320} height={200} loading="lazy" decoding="async" onError={() => setImageFailed(true)} className="size-full object-cover" />
        )}
        {p.freeShipping && <span className="absolute top-2 left-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">Free shipping</span>}
      </div>
      <p className="mt-3 text-[11px] font-semibold tracking-wide text-muted uppercase">{p.category}</p>
      <h3 className="mt-0.5 text-[15px] leading-snug font-semibold">{p.name}</h3>
      <p className="mt-1 flex-1 text-[13px] leading-snug text-muted">{p.tagline}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-lg font-bold tracking-tight">{formatINR(p.price)}</span>
        <Button variant="secondary" size="sm" onClick={() => onAsk(askAboutProduct(p))} {...tip('The assistant tells you about this product', 'top', 'end')}>
          <Icon name="sparkles" size={14} />
          Ask about this
        </Button>
      </div>
    </article>
  );
});

interface Props {
  catalog: ReturnType<typeof useProducts>;
  onAsk(text: string): void;
}

export function ProductGrid({ catalog, onAsk }: Props) {
  return (
    <section id="products" aria-labelledby="products-title" className="scroll-mt-24">
      <div className="mb-4">
        <h2 id="products-title" className="text-xl font-bold tracking-tight">
          Popular right now
        </h2>
        <p className="text-sm text-muted">Everyday tech that ships free over ₹499. Tap "Ask about this" and the assistant tells you all about it.</p>
      </div>

      {catalog.loading ? (
        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : catalog.error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-danger-soft p-4 text-sm text-danger" role="alert">
          <span>We couldn't load the products.</span>
          <Button variant="secondary" size="sm" onClick={() => void catalog.reload()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3">
          {catalog.products.map((p) => (
            <ProductCard key={p.id} product={p} onAsk={onAsk} />
          ))}
        </div>
      )}
    </section>
  );
}
