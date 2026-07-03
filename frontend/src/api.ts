import type { Filters, SearchFacets, SearchResponse, SortKey, Suggestion } from './types';

const BASE = '/api';

function buildSearchParams(args: {
  q: string;
  filters: Filters;
  sort: SortKey;
  page: number;
  pageSize: number;
}): string {
  const p = new URLSearchParams();
  if (args.q) p.set('q', args.q);
  const { filters } = args;
  if (filters.categories.length) p.set('categories', filters.categories.join(','));
  if (filters.productTypes.length) p.set('productTypes', filters.productTypes.join(','));
  if (filters.materials.length) p.set('materials', filters.materials.join(','));
  if (filters.brands.length) p.set('brands', filters.brands.join(','));
  if (filters.minPrice != null) p.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) p.set('maxPrice', String(filters.maxPrice));
  if (filters.minRating != null) p.set('minRating', String(filters.minRating));
  if (filters.inStockOnly) p.set('inStockOnly', 'true');
  p.set('sort', args.sort);
  p.set('page', String(args.page));
  p.set('pageSize', String(args.pageSize));
  return p.toString();
}

export async function search(args: {
  q: string;
  filters: Filters;
  sort: SortKey;
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}): Promise<SearchResponse> {
  const res = await fetch(`${BASE}/search?${buildSearchParams(args)}`, { signal: args.signal });
  if (!res.ok) throw new Error(`Search request failed: ${res.status}`);
  return res.json();
}

export async function suggest(q: string, signal?: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch(`${BASE}/suggest?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions ?? [];
}

export async function getFacets(signal?: AbortSignal): Promise<SearchFacets> {
  const res = await fetch(`${BASE}/facets`, { signal });
  if (!res.ok) throw new Error(`Facets request failed: ${res.status}`);
  return res.json();
}
