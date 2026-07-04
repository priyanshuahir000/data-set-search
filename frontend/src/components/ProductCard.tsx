import { useState } from 'react';
import type { Product } from '../types';
import { useCart } from '../cart';
import {
  badgeFor,
  compact,
  categoryInk,
  categoryTint,
  deriveMrp,
  isNew,
  money,
  typeIcon,
} from '../taxonomy';
import { Highlight } from './Highlight';
import { Sym } from './Sym';

const BADGE_TEXT: Record<'bestseller' | 'coming' | 'out', string> = {
  bestseller: 'Bestseller',
  coming: 'Coming soon',
  out: 'Out of stock',
};

interface ProductCardProps {
  product: Product;
  tokens?: string[];
  index?: number;
}

export function ProductCard({ product, tokens = [], index = 0 }: ProductCardProps) {
  const { qty, add, dec } = useCart();
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const id = String(product.id);
  const q = qty(id);
  const out = !product.inStock;
  const soon = product.isFuture;
  const badge = badgeFor(product);

  const tint = categoryTint(product.category);
  const ink = categoryInk(product.category);
  const icon = typeIcon(product.productType);

  const mrp = deriveMrp(product);
  const off = mrp - Math.round(product.price);
  const showDiscount = off > 0 && !out;

  const showRating = product.reviews > 0;
  const showNew = isNew(product);

  const canBuy = !out && !soon;

  return (
    <article
      className="card"
      style={{ animationDelay: `${(index % 10) * 35}ms` }}
    >
      <div className="card-media-wrap">
        <div className="card-media" style={{ background: tint }}>
          <span className="card-media-icon">
            <Sym name={icon} size={64} fill={1} weight={500} color={ink} />
          </span>
          {product.image && !imgFailed && (
            <img
              className={`card-media-img${imgLoaded ? ' is-loaded' : ''}`}
              src={product.image}
              alt={product.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
            />
          )}
          {out && <span className="card-media-dim" aria-hidden="true" />}
          {badge && <span className={`badge badge-${badge}`}>{BADGE_TEXT[badge]}</span>}
        </div>

        <div className="card-add">
          {canBuy && q === 0 && (
            <button className="add-btn" onClick={() => add(product)}>
              ADD
            </button>
          )}
          {canBuy && q > 0 && (
            <div className="stepper">
              <button className="stepper-btn" onClick={() => dec(id)} aria-label="Remove one">
                −
              </button>
              <span className="stepper-qty">{q}</span>
              <button className="stepper-btn" onClick={() => add(product)} aria-label="Add one">
                +
              </button>
            </div>
          )}
          {!canBuy && (
            <button className="notify-btn" onClick={() => {}}>
              Notify me
            </button>
          )}
        </div>
      </div>

      <div className="card-priceline">
        <span className="price-pill">{money(product.price)}</span>
        {showDiscount && <span className="mrp">{money(mrp)}</span>}
      </div>
      {showDiscount && (
        <div className="off-row">
          <span className="off-text">{money(off)} OFF</span>
          <span className="off-leader" aria-hidden="true" />
        </div>
      )}

      <h3 className="card-title">
        <Highlight text={product.title} tokens={tokens} />
      </h3>
      <div className="card-brand">{product.brand}</div>

      <div className="card-meta">
        {product.material && <span className="material-chip">{product.material}</span>}
        {showRating && (
          <span className="card-rating">
            <span className="card-star">★</span>
            {product.rating.toFixed(1)}
            <span className="card-reviews">({compact(product.reviews)})</span>
          </span>
        )}
        {showNew && <span className="new-chip">NEW</span>}
      </div>
    </article>
  );
}
