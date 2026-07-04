import type { RefObject } from 'react';
import type { Product } from '../types';
import { PromoBanners } from '../components/PromoBanners';
import { ProductRail } from '../components/ProductRail';
import { HomeRailsSkeleton } from '../components/Skeletons';
import { EndOfList } from '../components/EndOfList';

export interface HomeRail {
  type: string;
  title: string;
  items: Product[];
  onSeeAll: () => void;
}

interface HomeViewProps {
  sections: HomeRail[]; // one rail per product type, revealed lazily
  loading: boolean; // a batch is currently being fetched
  exhausted: boolean; // every product type has been revealed
  sentinelRef: RefObject<HTMLDivElement>;
  onShopNew: () => void;
  onEditor: () => void;
}

export function HomeView({
  sections,
  loading,
  exhausted,
  sentinelRef,
  onShopNew,
  onEditor,
}: HomeViewProps) {
  return (
    <main className="view view-home">
      <PromoBanners onShopNew={onShopNew} onEditor={onEditor} />

      {sections.map((rail) => (
        <ProductRail key={rail.type} title={rail.title} items={rail.items} onSeeAll={rail.onSeeAll} />
      ))}

      {/* First paint (no sections yet) or an in-flight batch → shimmer. */}
      {loading && <HomeRailsSkeleton />}

      {/* Sentinel: entering the viewport reveals the next batch of sections. */}
      <div ref={sentinelRef} className="scroll-sentinel" />

      {exhausted && sections.length > 0 && <EndOfList />}
    </main>
  );
}
