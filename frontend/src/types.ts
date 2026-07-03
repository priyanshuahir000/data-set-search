export type SortKey =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'reviews'
  | 'newest';

export interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  material: string;
  productType: string;
  style: string;
  tags: string[];
  price: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  releasedAt: string;
  isFuture: boolean;
  image: string;
  imageWidth: number;
  imageHeight: number;
  description: string;
  popularity: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface SearchFacets {
  categories: FacetValue[];
  brands: FacetValue[];
  materials: FacetValue[];
  productTypes: FacetValue[];
  priceRange: { min: number; max: number };
}

export interface IntentChip {
  type: 'price' | 'rating' | 'stock' | 'sort';
  label: string;
}

export interface ResultPartition {
  count: number;
  label: string;
}

export interface SearchResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  sort: SortKey;
  query: string;
  appliedQuery: string;
  understood: IntentChip[];
  partition: ResultPartition | null;
  queryTokens: string[];
  didYouMean: string | null;
  correctedQuery: string | null;
  facets: SearchFacets;
  tookMs: number;
}

export interface Suggestion {
  label: string;
  kind: 'product' | 'productType' | 'brand' | 'material' | 'category';
  count?: number;
}

export interface Filters {
  categories: string[];
  productTypes: string[];
  materials: string[];
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly: boolean;
}

export const emptyFilters: Filters = {
  categories: [],
  productTypes: [],
  materials: [],
  brands: [],
  inStockOnly: false,
};
