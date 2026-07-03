import type Database from 'better-sqlite3';
import type { DB } from '../db/connection.js';
import type {
  FacetValue,
  Product,
  SearchFacets,
  SearchParams,
  SearchResponse,
  SortKey,
  Suggestion,
} from '../types.js';
import { tokenize } from './text.js';
import { buildMatchExpression, correctTokens } from './query.js';
import { constraintLabel, hasSoftConstraints, parseIntent, type SoftConstraints } from './intent.js';

// bm25 column weights. Order matches the FTS table definition
// (product_id, title, product_type, material, brand, category, tags, description).
// Title and the derived product type carry the most intent; description is mostly
// boilerplate so it gets the least.
const BM25_WEIGHTS = '0.0, 10.0, 8.0, 4.0, 5.0, 3.0, 4.0, 2.0';

// How much text relevance vs. business signals decide the order of a keyword
// search. Text dominates on purpose: a great-looking product that does not match
// the words should not outrank a real match. See DECISIONS.md.
const W_TEXT = 0.68;
const W_QUALITY = 0.22;
const W_EXACT = 0.1;
const FUTURE_PENALTY = 0.05;

const REVIEWS_LOG_SCALE = Math.log10(2000);

interface ProductRow {
  id: string;
  title: string;
  title_raw: string;
  brand: string;
  category: string;
  material: string;
  product_type: string;
  style: string;
  tags: string;
  price: number;
  rating: number;
  reviews: number;
  in_stock: number;
  released_at: string;
  is_future: number;
  image: string;
  image_width: number;
  image_height: number;
  description: string;
  popularity: number;
  text_score?: number;
}

interface Candidate {
  product: Product;
  textRel: number; // 0 for browse, otherwise -bm25 (higher is a better text match)
}

type FilterDimension = 'category' | 'brand' | 'material' | 'productType' | 'price';

function safeParseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    titleRaw: row.title_raw,
    brand: row.brand,
    category: row.category,
    material: row.material,
    productType: row.product_type,
    style: row.style,
    tags: safeParseTags(row.tags),
    price: row.price,
    rating: row.rating,
    reviews: row.reviews,
    inStock: row.in_stock === 1,
    releasedAt: row.released_at,
    isFuture: row.is_future === 1,
    image: row.image,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    description: row.description,
    popularity: row.popularity,
  };
}

export class SearchEngine {
  private readonly db: DB;
  private readonly ftsStmt: Database.Statement;
  private readonly allStmt: Database.Statement;
  private readonly byIdStmt: Database.Statement;

  private lexicon: { term: string; freq: number }[] = [];
  private lexiconSet = new Set<string>();

  private categoryFacets: FacetValue[] = [];
  private brandFacets: FacetValue[] = [];
  private materialFacets: FacetValue[] = [];
  private productTypeFacets: FacetValue[] = [];
  private globalPriceRange = { min: 0, max: 0 };
  private totalProducts = 0;

  constructor(db: DB) {
    this.db = db;
    this.ftsStmt = db.prepare(`
      SELECT p.*, bm25(products_fts, ${BM25_WEIGHTS}) AS text_score
      FROM products_fts
      JOIN products p ON p.id = products_fts.product_id
      WHERE products_fts MATCH ?
    `);
    this.allStmt = db.prepare('SELECT *, 0 AS text_score FROM products');
    this.byIdStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    this.loadCaches();
  }

  private loadCaches(): void {
    this.lexicon = this.db.prepare('SELECT term, freq FROM lexicon').all() as {
      term: string;
      freq: number;
    }[];
    this.lexiconSet = new Set(this.lexicon.map((l) => l.term));

    const facet = (column: string, whereNonEmpty = false): FacetValue[] => {
      const where = whereNonEmpty ? `WHERE ${column} <> ''` : '';
      return this.db
        .prepare(
          `SELECT ${column} AS value, COUNT(*) AS count FROM products ${where} GROUP BY ${column} ORDER BY count DESC, value ASC`,
        )
        .all() as FacetValue[];
    };

    this.categoryFacets = facet('category');
    this.brandFacets = facet('brand');
    this.materialFacets = facet('material', true);
    this.productTypeFacets = facet('product_type', true);

    const range = this.db.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products').get() as {
      min: number;
      max: number;
    };
    this.globalPriceRange = { min: range?.min ?? 0, max: range?.max ?? 0 };
    this.totalProducts = (this.db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n;
  }

  get productCount(): number {
    return this.totalProducts;
  }

  private matchFts(tokens: string[]): Candidate[] {
    const expr = buildMatchExpression(tokens);
    try {
      const rows = this.ftsStmt.all(expr) as ProductRow[];
      return rows.map((row) => ({
        product: rowToProduct(row),
        textRel: -(row.text_score ?? 0),
      }));
    } catch {
      // A malformed MATCH expression should degrade to "no matches", never a 500.
      return [];
    }
  }

  search(params: SearchParams): SearchResponse {
    const start = performance.now();

    // Read soft constraints and sort hints out of the raw query, then search only
    // on the words that remain. "towel under 200" searches "towel".
    const intent = parseIntent(params.q);
    const soft = intent.soft;
    const effectiveSort =
      params.sort === 'relevance' && intent.sortHint ? intent.sortHint : params.sort;

    const rawTokens = tokenize(intent.text);
    const browse = rawTokens.length === 0;

    let candidates: Candidate[];
    let highlightTokens = rawTokens;
    let didYouMean: string | null = null;
    let correctedQuery: string | null = null;

    if (browse) {
      candidates = (this.allStmt.all() as ProductRow[]).map((row) => ({
        product: rowToProduct(row),
        textRel: 0,
      }));
    } else {
      candidates = this.matchFts(rawTokens);

      // Nothing matched: try a spelling correction and search again.
      if (candidates.length === 0) {
        const { tokens: fixed, changed } = correctTokens(rawTokens, this.lexicon, this.lexiconSet);
        if (changed) {
          const retry = this.matchFts(fixed);
          didYouMean = fixed.join(' ');
          if (retry.length > 0) {
            candidates = retry;
            correctedQuery = fixed.join(' ');
            highlightTokens = fixed;
          }
        }
      }
    }

    const filters = this.buildFilters(params);
    const facets = this.computeFacets(candidates, filters);

    const results = candidates.filter((c) => filters(c.product));
    const ranked = this.rank(results, browse, effectiveSort, intent.text);

    // Float the items that satisfy the soft constraints to the front, keeping the
    // rest in rank order after a divider the UI can label.
    const { ordered, partition } = this.partition(ranked, soft);

    const total = ordered.length;
    const pageSize = Math.max(1, Math.min(params.pageSize, 96));
    const page = Math.max(1, params.page);
    const startIndex = (page - 1) * pageSize;
    const pageItems = ordered.slice(startIndex, startIndex + pageSize).map((c) => c.product);

    return {
      items: pageItems,
      total,
      page,
      pageSize,
      sort: params.sort,
      query: params.q,
      appliedQuery: intent.text,
      understood: intent.chips,
      partition,
      queryTokens: highlightTokens,
      didYouMean,
      correctedQuery,
      facets,
      tookMs: Math.round((performance.now() - start) * 100) / 100,
    };
  }

  // Split the ranked list into items that satisfy every soft constraint and those
  // that do not, preserving rank order within each part.
  private partition(
    ranked: Candidate[],
    soft: SoftConstraints,
  ): { ordered: Candidate[]; partition: { count: number; label: string } | null } {
    if (!hasSoftConstraints(soft)) {
      return { ordered: ranked, partition: null };
    }

    const satisfies = (p: Product): boolean => {
      if (soft.maxPrice != null && p.price > soft.maxPrice) return false;
      if (soft.minPrice != null && p.price < soft.minPrice) return false;
      if (soft.minRating != null && p.rating < soft.minRating) return false;
      if (soft.inStock && !p.inStock) return false;
      return true;
    };

    const matches: Candidate[] = [];
    const rest: Candidate[] = [];
    for (const c of ranked) (satisfies(c.product) ? matches : rest).push(c);

    return {
      ordered: [...matches, ...rest],
      partition: { count: matches.length, label: constraintLabel(soft) },
    };
  }

  // Returns a predicate that applies every active filter, optionally skipping one
  // dimension so we can count that facet as if its own selection were not applied.
  private buildFilters(params: SearchParams) {
    const cats = new Set(params.categories);
    const brands = new Set(params.brands);
    const materials = new Set(params.materials);
    const types = new Set(params.productTypes);
    const { minPrice, maxPrice, minRating, inStockOnly } = params;

    return (product: Product, exclude?: FilterDimension): boolean => {
      if (exclude !== 'category' && cats.size && !cats.has(product.category)) return false;
      if (exclude !== 'brand' && brands.size && !brands.has(product.brand)) return false;
      if (exclude !== 'material' && materials.size && !materials.has(product.material)) return false;
      if (exclude !== 'productType' && types.size && !types.has(product.productType)) return false;
      if (exclude !== 'price') {
        if (minPrice != null && product.price < minPrice) return false;
        if (maxPrice != null && product.price > maxPrice) return false;
      }
      if (minRating != null && product.rating < minRating) return false;
      if (inStockOnly && !product.inStock) return false;
      return true;
    };
  }

  private computeFacets(
    candidates: Candidate[],
    filters: (p: Product, exclude?: FilterDimension) => boolean,
  ): SearchFacets {
    const tally = (dimension: FilterDimension, field: keyof Product): FacetValue[] => {
      const counts = new Map<string, number>();
      for (const c of candidates) {
        if (!filters(c.product, dimension)) continue;
        const value = String(c.product[field] ?? '');
        if (!value) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.value.localeCompare(b.value)));
    };

    let priceMin = Infinity;
    let priceMax = -Infinity;
    for (const c of candidates) {
      if (!filters(c.product, 'price')) continue;
      priceMin = Math.min(priceMin, c.product.price);
      priceMax = Math.max(priceMax, c.product.price);
    }
    const priceRange =
      priceMin <= priceMax ? { min: priceMin, max: priceMax } : { ...this.globalPriceRange };

    return {
      categories: tally('category', 'category'),
      brands: tally('brand', 'brand'),
      materials: tally('material', 'material'),
      productTypes: tally('productType', 'productType'),
      priceRange,
    };
  }

  private qualityScore(p: Product): number {
    const ratingNorm = p.rating / 5;
    const reviewsNorm = Math.min(1, Math.log10(p.reviews + 1) / REVIEWS_LOG_SCALE);
    const stock = p.inStock ? 1 : 0;
    return 0.6 * ratingNorm + 0.25 * reviewsNorm + 0.15 * stock;
  }

  private rank(results: Candidate[], browse: boolean, sort: SortKey, queryText: string): Candidate[] {
    if (sort !== 'relevance') {
      return [...results].sort((a, b) => this.compareBySort(a, b, sort));
    }

    if (browse) {
      // No query: the best default is the strongest catalog, most reviewed and
      // in stock first.
      return [...results].sort((a, b) => b.product.popularity - a.product.popularity);
    }

    const maxRel = results.reduce((m, c) => Math.max(m, c.textRel), 0);
    const queryLower = queryText.trim().toLowerCase();

    const scored = results.map((c) => {
      const textNorm = maxRel > 0 ? c.textRel / maxRel : 0;
      const quality = this.qualityScore(c.product);
      const exact = queryLower.length > 1 && c.product.title.toLowerCase().includes(queryLower) ? 1 : 0;
      let score = W_TEXT * textNorm + W_QUALITY * quality + W_EXACT * exact;
      if (c.product.isFuture) score -= FUTURE_PENALTY;
      return { c, score };
    });

    scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : b.c.product.popularity - a.c.product.popularity));
    return scored.map((s) => s.c);
  }

  private compareBySort(a: Candidate, b: Candidate, sort: SortKey): number {
    switch (sort) {
      case 'price_asc':
        return a.product.price - b.product.price || b.product.popularity - a.product.popularity;
      case 'price_desc':
        return b.product.price - a.product.price || b.product.popularity - a.product.popularity;
      case 'rating':
        return b.product.rating - a.product.rating || b.product.reviews - a.product.reviews;
      case 'reviews':
        return b.product.reviews - a.product.reviews || b.product.rating - a.product.rating;
      case 'newest':
        return (b.product.releasedAt ?? '').localeCompare(a.product.releasedAt ?? '');
      default:
        return 0;
    }
  }

  suggest(q: string, limit = 8): Suggestion[] {
    const tokens = tokenize(q);
    if (tokens.length === 0) return [];
    const prefix = tokens[tokens.length - 1]!;
    const whole = tokens.join(' ');

    const out: Suggestion[] = [];
    const seen = new Set<string>();
    const push = (label: string, kind: Suggestion['kind'], count?: number) => {
      const key = `${kind}:${label.toLowerCase()}`;
      if (!label || seen.has(key)) return;
      seen.add(key);
      out.push({ label, kind, count });
    };

    const startsWith = (value: string) =>
      value.toLowerCase().startsWith(prefix) || value.toLowerCase().startsWith(whole);

    for (const f of this.productTypeFacets) {
      if (out.length >= 4) break;
      if (startsWith(f.value)) push(f.value, 'productType', f.count);
    }
    for (const f of this.brandFacets) {
      if (startsWith(f.value)) push(f.value, 'brand', f.count);
    }
    for (const f of this.materialFacets) {
      if (startsWith(f.value)) push(f.value, 'material', f.count);
    }

    // A few real products so the dropdown always shows something concrete.
    const productRows = this.matchFts(tokens)
      .sort((a, b) => b.product.popularity - a.product.popularity)
      .slice(0, 5);
    for (const c of productRows) {
      if (out.length >= limit) break;
      push(c.product.title, 'product');
    }

    return out.slice(0, limit);
  }

  getProduct(id: string): Product | null {
    const row = this.byIdStmt.get(id) as ProductRow | undefined;
    return row ? rowToProduct(row) : null;
  }

  globalFacets(): SearchFacets {
    return {
      categories: this.categoryFacets,
      brands: this.brandFacets,
      materials: this.materialFacets,
      productTypes: this.productTypeFacets,
      priceRange: { ...this.globalPriceRange },
    };
  }
}
