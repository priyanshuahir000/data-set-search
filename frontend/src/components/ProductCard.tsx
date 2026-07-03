import { useState } from 'react';
import type { Product } from '../types';
import { Highlight } from './Highlight';
import { RatingStars } from './RatingStars';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface ProductCardProps {
  product: Product;
  tokens: string[];
  index?: number;
}

export function ProductCard({ product, tokens, index = 0 }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <article className="card card-enter" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="card-media">
        {product.image && !imageFailed ? (
          <img
            className={imageLoaded ? 'is-loaded' : ''}
            src={product.image}
            alt={product.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="card-media-fallback" aria-hidden="true">
            {product.productType || product.category}
          </div>
        )}

        {product.isFuture ? (
          <span className="badge badge-soon">Coming soon</span>
        ) : !product.inStock ? (
          <span className="badge badge-out">Out of stock</span>
        ) : null}
      </div>

      <div className="card-body">
        <div className="card-brand">{product.brand}</div>
        <h3 className="card-title">
          <Highlight text={product.title} tokens={tokens} />
        </h3>
        {(product.material || product.productType) && (
          <div className="card-meta">
            {product.material && <span>{product.material}</span>}
            {product.material && product.productType && <span className="dot" aria-hidden="true" />}
            {product.productType && <span>{product.productType}</span>}
          </div>
        )}

        <div className="card-footer">
          <span className="card-price">{money.format(product.price)}</span>
          <RatingStars rating={product.rating} reviews={product.reviews} />
        </div>
      </div>
    </article>
  );
}
