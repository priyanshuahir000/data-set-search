import type { RefObject } from 'react';
import type { Filters as FiltersState, IntentChip, Product, SearchFacets, SortKey } from '../types';
import { FilterRail } from '../components/FilterRail';
import { ProductCard } from '../components/ProductCard';
import { GridSkeleton } from '../components/Skeletons';
import { EndOfList } from '../components/EndOfList';
import { Sym } from '../components/Sym';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'rating', label: 'Top rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

export interface SearchFilterProps {
  facets: SearchFacets;
  filters: FiltersState;
  onToggle: (dimension: keyof FiltersState, value: string) => void;
  onPrice: (min: number | undefined, max: number | undefined) => void;
  onRating: (min: number | undefined) => void;
  onInStock: (on: boolean) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

interface SearchViewProps {
  query: string;
  total: number;
  understood: IntentChip[];
  activeChips: { label: string; onRemove: () => void }[];
  filterProps: SearchFilterProps;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  items: Product[];
  tokens: string[];
  loading: boolean;
  error: string | null;
  correctedQuery: string | null;
  didYouMean: string | null;
  onDidYouMean: () => void;
  onRetry: () => void;
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  sentinelRef: RefObject<HTMLDivElement>;
  isPhone: boolean;
  sheetOpen: boolean;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  fabCount: number;
  fabRaised: boolean;
}

export function SearchView(props: SearchViewProps) {
  const {
    query,
    total,
    understood,
    activeChips,
    filterProps,
    sort,
    onSort,
    items,
    tokens,
    loading,
    error,
    correctedQuery,
    didYouMean,
    onDidYouMean,
    onRetry,
    canLoadMore,
    loadingMore,
    onLoadMore,
    sentinelRef,
    isPhone,
    sheetOpen,
    onOpenSheet,
    onCloseSheet,
    fabCount,
    fabRaised,
  } = props;

  const showEmpty = !loading && !error && items.length === 0;
  const showResults = !loading && !error && items.length > 0;

  return (
    <main className="view view-search">
      <div className="two-pane">
        {!isPhone && (
          <aside className="filter-rail" data-lenis-prevent>
            <FilterRail {...filterProps} />
          </aside>
        )}

        <section className="two-pane-content">
          <div className="search-toolbar">
            <div className="search-count">
              <strong>{total.toLocaleString()}</strong> {total === 1 ? 'result' : 'results'}
              {query && (
                <>
                  {' '}
                  for <span className="search-q">“{query}”</span>
                </>
              )}
            </div>
            <label className="sort">
              Sort
              <select
                className="sort-select"
                name="sort"
                value={sort}
                onChange={(e) => onSort(e.target.value as SortKey)}
                aria-label="Sort results"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {understood.length > 0 && (
            <div className="understood">
              <span className="understood-label">Reading your search as</span>
              {understood.map((chip, i) => (
                <span key={i} className="understood-chip">
                  <Sym name="auto_awesome" size={15} />
                  {chip.label}
                </span>
              ))}
            </div>
          )}

          {correctedQuery && (
            <div className="corrected-note">
              Showing results for <strong>{correctedQuery}</strong>.
            </div>
          )}

          {activeChips.length > 0 && (
            <div className="chips-row">
              {activeChips.map((chip) => (
                <button key={chip.label} className="active-chip" onClick={chip.onRemove}>
                  {chip.label}
                  <Sym name="close" size={15} color="#98A199" />
                </button>
              ))}
              <button className="link-button" onClick={filterProps.onClear}>
                Clear all
              </button>
            </div>
          )}

          {loading && <GridSkeleton count={10} />}

          {!loading && error && (
            <div className="state">
              <div className="state-illus state-illus-error" aria-hidden="true">
                <Sym name="cloud_off" size={72} fill={1} color="#B77914" />
              </div>
              <h2 className="state-title">We couldn’t reach the catalog</h2>
              <p className="state-body">Check your connection and try again.</p>
              <button className="btn-primary" onClick={onRetry}>
                <Sym name="refresh" size={19} color="#fff" />
                Try again
              </button>
            </div>
          )}

          {showEmpty && (
            <div className="state">
              <div className="state-illus-img" aria-hidden="true">
                <img src="/no-results.png" alt="No matches found" />
              </div>
              <h2 className="state-title">No matches{query ? ` for “${query}”` : ''}</h2>
              {didYouMean ? (
                <p className="state-body">
                  Did you mean{' '}
                  <button className="link-button" onClick={onDidYouMean}>
                    {didYouMean}
                  </button>
                  ?
                </p>
              ) : (
                <p className="state-body">Try fewer words, or clear a filter or two.</p>
              )}
              <button className="btn-primary" onClick={filterProps.onClear}>
                Clear filters
              </button>
            </div>
          )}

          {showResults && (
            <>
              <div className="grid">
                {items.map((p, i) => (
                  <ProductCard key={p.id} product={p} tokens={tokens} index={i} />
                ))}
              </div>
              <div ref={sentinelRef} className="scroll-sentinel" />
              {canLoadMore ? (
                <div className="load-more-row">
                  <button className="load-more" onClick={onLoadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : 'Show more'}
                  </button>
                </div>
              ) : (
                <EndOfList />
              )}
            </>
          )}
        </section>
      </div>

      {isPhone && (
        <button className={`filters-fab${fabRaised ? ' is-raised' : ''}`} onClick={onOpenSheet}>
          <Sym name="tune" size={20} color="#fff" />
          Filters
          {fabCount > 0 && <span className="filters-fab-count">{fabCount}</span>}
        </button>
      )}

      {isPhone && sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={onCloseSheet} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="sheet-handle" />
            <div className="sheet-head">
              <span className="sheet-title">Filters</span>
              <button className="sheet-close" onClick={onCloseSheet} aria-label="Close filters">
                <Sym name="close" size={19} color="#3A423B" />
              </button>
            </div>
            <div className="sheet-body" data-lenis-prevent>
              <FilterRail {...filterProps} showHead={false} />
            </div>
            <div className="sheet-foot">
              <button className="sheet-clear" onClick={filterProps.onClear}>
                Clear
              </button>
              <button className="sheet-apply" onClick={onCloseSheet}>
                Show {total.toLocaleString()} results
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
