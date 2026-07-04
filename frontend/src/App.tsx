import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from './api';
import { useCart } from './cart';
import { useDebounce } from './hooks/useDebounce';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import {
  CATEGORY_BY_NAME,
  HOME_SECTION_TYPES,
  categoryOfType,
  money,
  plural,
  typeLabel,
} from './taxonomy';
import { Header } from './components/Header';
import { CartBar } from './components/CartBar';
import { HomeView, type HomeRail } from './views/HomeView';
import { CategoryView } from './views/CategoryView';
import { SearchView, type SearchFilterProps } from './views/SearchView';
import {
  emptyFilters,
  type FacetValue,
  type Filters as FiltersState,
  type Product,
  type SearchResponse,
  type SortKey,
  type Suggestion,
} from './types';

type View = 'home' | 'category' | 'search';

const PAGE_SIZE = 24;
const RAIL_SIZE = 14;
const SECTION_BATCH = 3; // product-type sections revealed per lazy load
const MIN_SKELETON_MS = 620;

const ARRAY_DIMENSIONS: (keyof FiltersState)[] = ['categories', 'productTypes', 'materials', 'brands'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The API's category / productType / material / brand values are all Title Case
// and match the design taxonomy verbatim, so filter/nav values pass through
// unchanged.

export function App() {
  const setScrollLocked = useSmoothScroll();
  const isPhone = useMediaQuery('(max-width: 900px)');
  const cart = useCart();

  const [view, setView] = useState<View>('home');
  const [activeCategory, setActiveCategory] = useState('Lighting');
  const [activeSub, setActiveSub] = useState('');

  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [sort, setSort] = useState<SortKey>('relevance');
  const [page, setPage] = useState(1);

  const [categoryItems, setCategoryItems] = useState<Product[]>([]);
  const [categorySubs, setCategorySubs] = useState<FacetValue[]>([]);
  const [searchItems, setSearchItems] = useState<Product[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchResponse | null>(null);

  // Home: one rail per product type ("Table Lamps", "Side Tables", …), revealed
  // lazily in batches as the shopper scrolls.
  const [homeSections, setHomeSections] = useState<{ type: string; items: Product[] }[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsDone, setSectionsDone] = useState(false);
  const sectionPtrRef = useRef(0);
  const sectionBusyRef = useRef(false);
  const sectionSessionRef = useRef(0);
  const homeSentinelRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [compact, setCompact] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const debouncedSuggest = useDebounce(input, 110);

  // --- scroll to top + reset the scroll-morph on any navigation ---------------
  const resetScroll = useCallback(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      /* noop */
    }
    setCompact(false);
  }, []);

  // --- navigation -------------------------------------------------------------
  const navHome = useCallback(() => {
    resetScroll();
    setSheetOpen(false);
    setInput('');
    setSubmittedQuery('');
    setView('home');
  }, [resetScroll]);

  const openCategory = useCallback(
    (name: string) => {
      const def = CATEGORY_BY_NAME[name];
      resetScroll();
      setSheetOpen(false);
      setInput('');
      setSubmittedQuery('');
      setActiveCategory(name);
      setActiveSub(def ? def.subs[0]! : '');
      setView('category');
    },
    [resetScroll],
  );

  const openCategoryType = useCallback(
    (name: string, sub: string) => {
      resetScroll();
      setSheetOpen(false);
      setInput('');
      setSubmittedQuery('');
      setActiveCategory(name);
      setActiveSub(sub);
      setView('category');
    },
    [resetScroll],
  );

  const selectSub = useCallback(
    (sub: string) => {
      resetScroll();
      setActiveSub(sub);
    },
    [resetScroll],
  );

  const runQuery = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      resetScroll();
      setSheetOpen(false);
      setInput(q);
      setSubmittedQuery(q);
      setPage(1);
      setView('search');
    },
    [resetScroll],
  );

  // --- data: home sections (one rail per product type, lazily revealed) --------
  const loadMoreSections = useCallback(async () => {
    if (sectionBusyRef.current) return;
    if (sectionPtrRef.current >= HOME_SECTION_TYPES.length) return;
    sectionBusyRef.current = true;
    setSectionsLoading(true);
    const session = sectionSessionRef.current;
    const start = sectionPtrRef.current;
    const batch = HOME_SECTION_TYPES.slice(start, start + SECTION_BATCH);
    try {
      const results = await Promise.all(
        batch.map(async (type) => {
          const res = await api.search({
            q: '',
            filters: { ...emptyFilters, productTypes: [type] },
            sort: 'relevance',
            page: 1,
            pageSize: RAIL_SIZE,
          });
          return { type, items: res.items };
        }),
      );
      if (session !== sectionSessionRef.current) return; // navigated away; drop
      sectionPtrRef.current = start + batch.length;
      // Skip types that returned nothing so we never render an empty rail.
      const nonEmpty = results.filter((r) => r.items.length > 0);
      setHomeSections((prev) => [...prev, ...nonEmpty]);
      if (sectionPtrRef.current >= HOME_SECTION_TYPES.length) setSectionsDone(true);
    } catch {
      /* leave the sentinel in place; a later intersection retries */
    } finally {
      if (session === sectionSessionRef.current) setSectionsLoading(false);
      sectionBusyRef.current = false;
    }
  }, []);

  // Reset the home sections whenever we (re)enter home.
  useEffect(() => {
    if (view !== 'home') return;
    sectionSessionRef.current += 1;
    sectionPtrRef.current = 0;
    sectionBusyRef.current = false;
    setHomeSections([]);
    setSectionsDone(false);
    setError(null);
  }, [view]);

  // Reveal the next batch of sections when the sentinel scrolls into view.
  const loadMoreSectionsRef = useRef(loadMoreSections);
  loadMoreSectionsRef.current = loadMoreSections;
  useEffect(() => {
    if (view !== 'home') return;
    const el = homeSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreSectionsRef.current();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [view]);

  // Keep revealing sections until the sentinel is pushed below the fold. Handles
  // first paint and tall viewports where one batch does not overflow the screen
  // (the IntersectionObserver alone would not re-fire while it stays in view).
  useEffect(() => {
    if (view !== 'home' || sectionsDone || sectionsLoading) return;
    const el = homeSentinelRef.current;
    if (!el) return;
    if (el.getBoundingClientRect().top <= window.innerHeight + 600) {
      loadMoreSectionsRef.current();
    }
  }, [view, homeSections, sectionsDone, sectionsLoading]);

  // --- data: category two-pane ------------------------------------------------
  useEffect(() => {
    if (view !== 'category' || !activeSub) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [res] = await Promise.all([
          api.search({
            q: '',
            filters: { ...emptyFilters, categories: [activeCategory], productTypes: [activeSub] },
            sort: 'relevance',
            page: 1,
            pageSize: 200,
            signal: controller.signal,
          }),
          sleep(MIN_SKELETON_MS),
        ]);
        if (controller.signal.aborted) return;
        setCategoryItems(res.items);
        // Order subcategories by the design taxonomy, with live counts from the
        // productType facet (which is computed as if the type filter were off).
        const counts = new Map(res.facets.productTypes.map((f) => [f.value, f.count]));
        const def = CATEGORY_BY_NAME[activeCategory];
        const ordered: FacetValue[] = (def?.subs ?? [])
          .map((s) => ({ value: s, count: counts.get(s) ?? 0 }))
          .filter((s) => s.count > 0);
        setCategorySubs(ordered.length ? ordered : res.facets.productTypes);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError('We could not reach the catalog.');
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [view, activeCategory, activeSub]);

  // --- data: search (page 1 replace on query / filters / sort) ----------------
  const runSearch = useCallback(
    async (opts: { page: number; replace: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      // Only the page-1 replace swaps the grid for a skeleton; "Show more"
      // appends beneath the existing grid with a button-local spinner.
      if (opts.replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const [res] = await Promise.all([
          api.search({
            q: submittedQuery,
            filters,
            sort,
            page: opts.page,
            pageSize: PAGE_SIZE,
            signal: controller.signal,
          }),
          opts.replace ? sleep(MIN_SKELETON_MS) : Promise.resolve(),
        ]);
        if (controller.signal.aborted) return;
        setSearchMeta(res);
        setSearchItems((prev) => (opts.replace ? res.items : [...prev, ...res.items]));
        setError(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError('We could not reach the catalog.');
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [submittedQuery, filters, sort],
  );

  useEffect(() => {
    if (view !== 'search') return;
    setPage(1);
    runSearch({ page: 1, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, submittedQuery, filtersKey, sort]);

  // --- autocomplete -----------------------------------------------------------
  useEffect(() => {
    if (debouncedSuggest.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    api.suggest(debouncedSuggest, controller.signal).then(setSuggestions).catch(() => {});
    return () => controller.abort();
  }, [debouncedSuggest]);

  // --- scroll-morph nav (home only), with hysteresis --------------------------
  useEffect(() => {
    let isCompact = false;
    const onScroll = () => {
      const st = window.scrollY || document.documentElement.scrollTop || 0;
      const next = isCompact ? st > 26 : st > 74;
      if (next !== isCompact) {
        isCompact = next;
        setCompact(next);
      }
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  // The sheet only exists on phone layout; if the viewport widens past the
  // breakpoint while it is open, close it so the lock below is released.
  useEffect(() => {
    if (!isPhone) setSheetOpen(false);
  }, [isPhone]);

  // --- lock background scroll while the mobile sheet is open ------------------
  // Gate on isPhone so a stale lock can never orphan the desktop layout, and
  // stop Lenis too — overflow:hidden alone does not stop smooth-scroll.
  useEffect(() => {
    const locked = isPhone && sheetOpen;
    document.body.style.overflow = locked ? 'hidden' : '';
    setScrollLocked(locked);
    return () => {
      document.body.style.overflow = '';
      setScrollLocked(false);
    };
  }, [isPhone, sheetOpen, setScrollLocked]);

  // --- filter mutations -------------------------------------------------------
  const toggleArrayFilter = useCallback((dimension: keyof FiltersState, value: string) => {
    if (!ARRAY_DIMENSIONS.includes(dimension)) return;
    setFilters((prev) => {
      const current = prev[dimension] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [dimension]: next };
    });
  }, []);

  const activeFilterCount =
    filters.categories.length +
    filters.productTypes.length +
    filters.materials.length +
    filters.brands.length +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.minRating != null ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0);

  const facets = searchMeta?.facets ?? {
    categories: [],
    brands: [],
    materials: [],
    productTypes: [],
    priceRange: { min: 0, max: 0 },
  };

  const filterProps: SearchFilterProps = {
    facets,
    filters,
    onToggle: toggleArrayFilter,
    onPrice: (min, max) => setFilters((p) => ({ ...p, minPrice: min, maxPrice: max })),
    onRating: (min) => setFilters((p) => ({ ...p, minRating: min })),
    onInStock: (on) => setFilters((p) => ({ ...p, inStockOnly: on })),
    onClear: () => setFilters(emptyFilters),
    hasActiveFilters: activeFilterCount > 0,
  };

  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    for (const dim of ARRAY_DIMENSIONS) {
      for (const value of filters[dim] as string[]) {
        const label = dim === 'productTypes' ? typeLabel(value) : value;
        chips.push({ label, onRemove: () => toggleArrayFilter(dim, value) });
      }
    }
    if (filters.minPrice != null || filters.maxPrice != null) {
      const min = filters.minPrice != null ? money(filters.minPrice) : 'Any';
      const max = filters.maxPrice != null ? money(filters.maxPrice) : 'Any';
      chips.push({
        label: `${min} – ${max}`,
        onRemove: () => setFilters((p) => ({ ...p, minPrice: undefined, maxPrice: undefined })),
      });
    }
    if (filters.minRating != null) {
      chips.push({
        label: `${filters.minRating}★ & up`,
        onRemove: () => setFilters((p) => ({ ...p, minRating: undefined })),
      });
    }
    if (filters.inStockOnly) {
      chips.push({ label: 'In stock', onRemove: () => setFilters((p) => ({ ...p, inStockOnly: false })) });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, toggleArrayFilter]);

  // --- derived view data ------------------------------------------------------
  const homeSectionData: HomeRail[] = useMemo(
    () =>
      homeSections.map((sec) => ({
        type: sec.type,
        title: plural(typeLabel(sec.type)),
        items: sec.items,
        onSeeAll: () => openCategoryType(categoryOfType(sec.type) ?? 'Decor', sec.type),
      })),
    [homeSections, openCategoryType],
  );

  const total = searchMeta?.total ?? 0;
  const canLoadMore = searchItems.length < total;
  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    runSearch({ page: next, replace: false });
  }, [page, runSearch]);

  const didYouMean = searchMeta?.didYouMean ?? searchMeta?.correctedQuery ?? null;
  const sentinelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app">
      <Header
        view={view}
        activeCategory={activeCategory}
        compact={compact}
        query={input}
        onQueryChange={setInput}
        onSubmit={runQuery}
        suggestions={suggestions}
        cartCount={cart.count}
        onHome={navHome}
        onOpenCategory={openCategory}
      />

      {view === 'home' && (
        <HomeView
          sections={homeSectionData}
          loading={sectionsLoading}
          exhausted={sectionsDone}
          sentinelRef={homeSentinelRef}
          onShopNew={() => openCategory('Decor')}
          onEditor={() => openCategory('Lighting')}
        />
      )}

      {view === 'category' && (
        <CategoryView
          catName={activeCategory}
          activeSub={activeSub}
          subs={categorySubs}
          items={categoryItems}
          loading={loading}
          isPhone={isPhone}
          onHome={navHome}
          onSelectSub={selectSub}
        />
      )}

      {view === 'search' && (
        <SearchView
          query={submittedQuery}
          total={total}
          understood={searchMeta?.understood ?? []}
          activeChips={activeChips}
          filterProps={filterProps}
          sort={sort}
          onSort={setSort}
          items={searchItems}
          tokens={searchMeta?.queryTokens ?? []}
          loading={loading}
          error={error}
          correctedQuery={searchMeta?.correctedQuery ?? null}
          didYouMean={didYouMean}
          onDidYouMean={() => didYouMean && runQuery(didYouMean)}
          onRetry={() => runSearch({ page: 1, replace: true })}
          canLoadMore={canLoadMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          sentinelRef={sentinelRef}
          isPhone={isPhone}
          sheetOpen={sheetOpen}
          onOpenSheet={() => setSheetOpen(true)}
          onCloseSheet={() => setSheetOpen(false)}
          fabCount={activeFilterCount}
          fabRaised={cart.count > 0}
        />
      )}

      {cart.count > 0 && (
        <CartBar count={cart.count} subtotal={cart.subtotal} onViewCart={() => {}} />
      )}
    </div>
  );
}
