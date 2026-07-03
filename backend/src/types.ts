// Shape of a single item in the source items.json file.
export interface RawItem {
  id: string;
  title: string;
  brand: string;
  category: string;
  tags: string[];
  price: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  releasedAt: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  description: string;
}

// Normalized product as stored in the database and returned by the API.
export interface Product {
  id: string;
  title: string; // cleaned, display ready
  titleRaw: string; // exactly as it arrived, kept for reference
  brand: string;
  category: string;
  material: string; // derived from the title
  productType: string; // derived from the title (what the shopper actually searches for)
  style: string; // derived leading modifier
  tags: string[];
  price: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  releasedAt: string;
  isFuture: boolean; // releasedAt is in the future, so it is not on sale yet
  image: string;
  imageWidth: number;
  imageHeight: number;
  description: string;
  popularity: number; // precomputed quality prior used for ranking and browse order
}

export type SortKey =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'reviews'
  | 'newest';

export interface SearchParams {
  q: string;
  categories: string[];
  brands: string[];
  materials: string[];
  productTypes: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly: boolean;
  sort: SortKey;
  page: number;
  pageSize: number;
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

// Where to draw the "more results" divider and what to call it. count is the
// number of leading items that satisfy the soft constraints read from the query.
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
  appliedQuery: string; // the query after intent phrases were removed
  understood: IntentChip[]; // constraints and hints read from the query
  partition: ResultPartition | null;
  queryTokens: string[]; // tokens the UI should highlight
  didYouMean: string | null;
  correctedQuery: string | null; // set when we searched a corrected spelling automatically
  facets: SearchFacets;
  tookMs: number;
}

export interface Suggestion {
  label: string;
  kind: 'product' | 'productType' | 'brand' | 'material' | 'category';
  count?: number;
}
