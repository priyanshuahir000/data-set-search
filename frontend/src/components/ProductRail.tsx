import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Sym } from './Sym';

interface ProductRailProps {
  title: string;
  items: Product[];
  onSeeAll: () => void;
}

export function ProductRail({ title, items, onSeeAll }: ProductRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update, items]);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 540), behavior: 'smooth' });
  };

  return (
    <section className="rail">
      <div className="rail-head">
        <h2 className="rail-title">{title}</h2>
        <button className="see-all" onClick={onSeeAll}>
          See all
          <Sym name="chevron_right" size={18} />
        </button>
      </div>
      <div className="rail-body">
        {!atStart && (
          <button className="rail-chevron rail-chevron-left" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}>
            <Sym name="chevron_left" size={22} color="#242B25" />
          </button>
        )}
        <div className="rail-track hs" ref={trackRef} onScroll={update}>
          {items.map((p, i) => (
            <div key={p.id} className="rail-item">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
        {!atEnd && (
          <button className="rail-chevron rail-chevron-right" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}>
            <Sym name="chevron_right" size={22} color="#242B25" />
          </button>
        )}
      </div>
    </section>
  );
}
