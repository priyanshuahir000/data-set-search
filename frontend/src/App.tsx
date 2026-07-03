import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from './api';
import { useDebounce } from './hooks/useDebounce';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { SearchBar } from './components/SearchBar';
import { Filters } from './components/Filters';
import { ProductGrid } from './components/ProductGrid';
import { Select } from './components/Select';
import { IconClose, IconSliders } from './components/Icons';
import {
  emptyFilters,
  type Filters as FiltersState,
  type Product,
  type SearchResponse,
  type SortKey,
  type Suggestion,
} from './types';

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'rating', label: 'Top rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

const ARRAY_DIMENSIONS: (keyof FiltersState)[] = [
  'categories',
  'productTypes',
  'materials',
  'brands',
];

export function App() {
  useSmoothScroll();

  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [sort, setSort] = useState<SortKey>('relevance');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Product[]>([]);
  const [meta, setMeta] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedSuggest = useDebounce(input, 110);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (opts: { q: string; filters: FiltersState; sort: SortKey; page: number; replace: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await api.search({
          q: opts.q,
          filters: opts.filters,
          sort: opts.sort,
          page: opts.page,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        });
        setMeta(res);
        setItems((prev) => (opts.replace ? res.items : [...prev, ...res.items]));
        setError(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('We could not reach the catalog. Is the API running?');
        }
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [],
  );

  // A submitted query, a filter change, or a sort change restarts from page one.
  useEffect(() => {
    setPage(1);
    runSearch({ q: submittedQuery, filters, sort, page: 1, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQuery, filtersKey, sort]);

  // Autocomplete.
  useEffect(() => {
    if (debouncedSuggest.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    api.suggest(debouncedSuggest, controller.signal).then(setSuggestions).catch(() => {});
    return () => controller.abort();
  }, [debouncedSuggest]);

  const total = meta?.total ?? 0;
  const canLoadMore = items.length < total;

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    runSearch({ q: submittedQuery, filters, sort, page: next, replace: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, submittedQuery, filtersKey, sort, runSearch]);

  // Infinite scroll. A ref keeps the observer callback pointed at fresh state
  // without re-creating the observer on every render.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<() => void>(() => {});
  loadMoreRef.current = () => {
    if (!loading && canLoadMore) loadMore();
  };
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lock background scroll while the mobile filter sheet is open.
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  const submitQuery = (q: string) => {
    setInput(q);
    setSubmittedQuery(q);
  };

  const toggleArrayFilter = (dimension: keyof FiltersState, value: string) => {
    if (!ARRAY_DIMENSIONS.includes(dimension)) return;
    setFilters((prev) => {
      const current = prev[dimension] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [dimension]: next };
    });
  };

  const activeFilterCount =
    filters.categories.length +
    filters.productTypes.length +
    filters.materials.length +
    filters.brands.length +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.minRating != null ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const facets = meta?.facets ?? {
    categories: [],
    brands: [],
    materials: [],
    productTypes: [],
    priceRange: { min: 0, max: 0 },
  };
  const tokens = meta?.queryTokens ?? [];
  const partition = meta?.partition ?? null;
  const understood = meta?.understood ?? [];
  const didYouMean = meta?.didYouMean ?? null;
  const correctedQuery = meta?.correctedQuery ?? null;

  const filtersProps = {
    facets,
    filters,
    onToggle: toggleArrayFilter,
    onPrice: (min: number | undefined, max: number | undefined) =>
      setFilters((p) => ({ ...p, minPrice: min, maxPrice: max })),
    onRating: (min: number | undefined) => setFilters((p) => ({ ...p, minRating: min })),
    onInStock: (on: boolean) => setFilters((p) => ({ ...p, inStockOnly: on })),
    onClear: () => setFilters(emptyFilters),
    hasActiveFilters,
  };

  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    for (const dim of ARRAY_DIMENSIONS) {
      for (const value of filters[dim] as string[]) {
        chips.push({ label: value, onRemove: () => toggleArrayFilter(dim, value) });
      }
    }
    if (filters.minPrice != null || filters.maxPrice != null) {
      const min = filters.minPrice != null ? `$${filters.minPrice}` : 'Any';
      const max = filters.maxPrice != null ? `$${filters.maxPrice}` : 'Any';
      chips.push({
        label: `${min} to ${max}`,
        onRemove: () => setFilters((p) => ({ ...p, minPrice: undefined, maxPrice: undefined })),
      });
    }
    if (filters.minRating != null) {
      chips.push({
        label: `${filters.minRating}+ stars`,
        onRemove: () => setFilters((p) => ({ ...p, minRating: undefined })),
      });
    }
    if (filters.inStockOnly) {
      chips.push({ label: 'In stock', onRemove: () => setFilters((p) => ({ ...p, inStockOnly: false })) });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const showEmpty = !error && !loading && items.length === 0;

  return (
    <div className="app">
      <div className={`route-progress ${loading ? 'active' : ''}`} aria-hidden="true">
        <span />
      </div>

      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">Maison</span>
            <span className="brand-sub">home goods</span>
          </div>
          <SearchBar value={input} onChange={setInput} onSubmit={submitQuery} suggestions={suggestions} />
          <div className="header-spacer" aria-hidden="true" />
        </div>
      </header>

      <main className="layout">
        <aside className="filters-rail" data-lenis-prevent>
          <Filters {...filtersProps} />
        </aside>

        <section className="results">
          <div className="toolbar">
            <div className="toolbar-count">
              {loading && items.length === 0 ? (
                <span className="counting">Searching the catalog</span>
              ) : (
                <>
                  <strong>{total.toLocaleString()}</strong> {total === 1 ? 'result' : 'results'}
                  {submittedQuery && (
                    <>
                      {' '}
                      for <span className="q">{submittedQuery}</span>
                    </>
                  )}
                  {meta && <span className="took"> in {meta.tookMs} ms</span>}
                </>
              )}
            </div>
            <label className="sort">
              <span>Sort</span>
              <Select
                value={sort}
                options={SORT_OPTIONS}
                onChange={(v) => setSort(v as SortKey)}
                ariaLabel="Sort results"
              />
            </label>
          </div>

          {understood.length > 0 && (
            <div className="understood">
              <span className="understood-label">Reading your search as</span>
              {understood.map((chip, i) => (
                <span key={i} className="understood-chip">
                  {chip.label}
                </span>
              ))}
            </div>
          )}

          {correctedQuery && (
            <div className="notice">
              Showing results for <strong>{correctedQuery}</strong>.
            </div>
          )}

          {activeChips.length > 0 && (
            <div className="chips-row">
              {activeChips.map((chip, i) => (
                <button key={i} className="chip chip-removable" onClick={chip.onRemove}>
                  {chip.label}
                  <IconClose size={13} />
                </button>
              ))}
              <button className="link-button" onClick={() => setFilters(emptyFilters)}>
                Clear all
              </button>
            </div>
          )}

          {error && <div className="state error">{error}</div>}

          {showEmpty ? (
            <div className="state empty">
              <div className="state-title">No matches{submittedQuery ? ` for "${submittedQuery}"` : ''}</div>
              {didYouMean ? (
                <div className="state-body">
                  Did you mean{' '}
                  <button className="link-button" onClick={() => submitQuery(didYouMean)}>
                    {didYouMean}
                  </button>
                  ?
                </div>
              ) : (
                <div className="state-body">Try fewer words, or clear a filter or two.</div>
              )}
              {hasActiveFilters && (
                <button className="button" onClick={() => setFilters(emptyFilters)}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <ProductGrid
                products={items}
                tokens={tokens}
                loading={loading}
                partition={partition}
                total={total}
              />
              <div ref={sentinelRef} className="scroll-sentinel" />
              {items.length > 0 && (
                <div className="grid-footer">
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Loading more
                    </>
                  ) : canLoadMore ? null : (
                    <span>That is everything</span>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <button className="filters-fab" onClick={() => setSheetOpen(true)}>
        <IconSliders size={17} />
        Filters
        {activeFilterCount > 0 && <span className="filters-fab-count">{activeFilterCount}</span>}
      </button>

      {sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="sheet-handle" />
            <div className="sheet-head">
              <span className="sheet-title">Filters</span>
              <div className="sheet-head-actions">
                {hasActiveFilters && (
                  <button className="link-button" onClick={() => setFilters(emptyFilters)}>
                    Clear all
                  </button>
                )}
                <button className="sheet-close" onClick={() => setSheetOpen(false)} aria-label="Close filters">
                  <IconClose size={16} />
                </button>
              </div>
            </div>
            <div className="sheet-body" data-lenis-prevent>
              <Filters {...filtersProps} showHead={false} />
            </div>
            <div className="sheet-foot">
              <button className="button" onClick={() => setSheetOpen(false)}>
                Show {total.toLocaleString()} {total === 1 ? 'result' : 'results'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
