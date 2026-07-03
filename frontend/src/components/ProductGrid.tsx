import { Fragment } from 'react';
import type { Product, ResultPartition } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  tokens: string[];
  loading: boolean;
  partition: ResultPartition | null;
  total: number;
}

const PAGE_STAGGER = 10;

export function ProductGrid({ products, tokens, loading, partition, total }: ProductGridProps) {
  if (loading && products.length === 0) {
    return (
      <div className="grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card card-skeleton">
            <div className="card-media skeleton-block" />
            <div className="card-body">
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line half" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Divider position. count === 0 means nothing matched the constraint, so the
  // strip sits at the very top; otherwise it sits between the matches and the rest.
  const boundary =
    partition && partition.count < total ? partition.count : -1;

  return (
    <div className={`grid ${loading ? 'is-loading' : ''}`}>
      {boundary === 0 && partition && (
        <Divider text={`No matches ${partition.label}. Showing the closest instead`} />
      )}
      {products.map((p, i) => (
        <Fragment key={p.id}>
          {i === boundary && boundary > 0 && partition && (
            <Divider text={`More results, not ${partition.label}`} />
          )}
          <ProductCard product={p} tokens={tokens} index={i % PAGE_STAGGER} />
        </Fragment>
      ))}
    </div>
  );
}

function Divider({ text }: { text: string }) {
  return (
    <div className="result-split" role="separator">
      <span className="result-split-line" />
      <span className="result-split-label">{text}</span>
      <span className="result-split-line" />
    </div>
  );
}
