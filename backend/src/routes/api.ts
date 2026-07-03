import { Router } from 'express';
import type { Request } from 'express';
import type { SearchEngine } from '../search/engine.js';
import type { SortKey } from '../types.js';

const SORT_KEYS: SortKey[] = ['relevance', 'price_asc', 'price_desc', 'rating', 'reviews', 'newest'];

// Accept both repeated params (?brands=A&brands=B) and comma lists (?brands=A,B).
function toArray(value: unknown): string[] {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

function toNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toSort(value: unknown): SortKey {
  const s = String(value ?? '') as SortKey;
  return SORT_KEYS.includes(s) ? s : 'relevance';
}

function parseSearch(req: Request) {
  return {
    q: String(req.query.q ?? '').slice(0, 200),
    categories: toArray(req.query.categories),
    brands: toArray(req.query.brands),
    materials: toArray(req.query.materials),
    productTypes: toArray(req.query.productTypes),
    minPrice: toNumber(req.query.minPrice),
    maxPrice: toNumber(req.query.maxPrice),
    minRating: toNumber(req.query.minRating),
    inStockOnly: String(req.query.inStockOnly ?? '') === 'true',
    sort: toSort(req.query.sort),
    page: toNumber(req.query.page) ?? 1,
    pageSize: toNumber(req.query.pageSize) ?? 24,
  };
}

export function createApiRouter(engine: SearchEngine): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', products: engine.productCount });
  });

  router.get('/facets', (_req, res) => {
    res.json(engine.globalFacets());
  });

  router.get('/suggest', (req, res) => {
    const q = String(req.query.q ?? '');
    res.json({ suggestions: engine.suggest(q) });
  });

  router.get('/products/:id', (req, res) => {
    const product = engine.getProduct(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  });

  router.get('/search', (req, res) => {
    try {
      res.json(engine.search(parseSearch(req)));
    } catch (err) {
      console.error('Search failed:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  return router;
}
