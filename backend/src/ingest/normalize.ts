import type { Product, RawItem } from '../types.js';
import {
  MATERIAL_SET,
  PRODUCT_TYPES_BY_LENGTH,
  STYLE_SET,
} from './vocabulary.js';

// Titles arrive dirty: some are padded ("  VINTAGE OAK BIN "), some are all caps,
// some are all lower ("brushed oak task lamp"). We trim, collapse inner runs of
// whitespace, and title-case each word so the display and the search index both
// see one consistent form. The original is preserved as title_raw.
export function cleanTitle(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  return collapsed
    .split(' ')
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

function titleCasePhrase(value: string): string {
  return value
    .split(' ')
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export interface DerivedFacets {
  style: string;
  material: string;
  productType: string;
}

// Split "[style] [material] [product type]" out of a cleaned title.
export function deriveFacets(cleanedTitle: string): DerivedFacets {
  const lower = cleanedTitle.toLowerCase();
  const tokens = lower.split(' ');

  const styleToken = tokens.find((t) => STYLE_SET.has(t)) ?? '';
  const materialToken = tokens.find((t) => MATERIAL_SET.has(t)) ?? '';

  let productType = '';
  for (const type of PRODUCT_TYPES_BY_LENGTH) {
    if (lower === type || lower.endsWith(' ' + type)) {
      productType = type;
      break;
    }
  }

  // Fallback: whatever remains once the style and material are removed is the
  // best guess at the product type. Keeps unknown shapes searchable.
  if (!productType) {
    productType = tokens
      .filter((t) => t !== styleToken && t !== materialToken)
      .join(' ')
      .trim();
  }

  return {
    style: styleToken ? titleCasePhrase(styleToken) : '',
    material: materialToken ? titleCasePhrase(materialToken) : '',
    productType: productType ? titleCasePhrase(productType) : '',
  };
}

// A single quality prior. Rating carries most of the signal; review count is
// log-scaled so a product with 1,800 reviews does not bury a great product with
// 200. Used as the browse-order default and as a tie-breaker inside search.
export function popularityScore(rating: number, reviews: number): number {
  return rating * Math.log10(reviews + 10);
}

function isFutureDate(releasedAt: string, now: Date): boolean {
  const released = new Date(releasedAt);
  return !Number.isNaN(released.getTime()) && released.getTime() > now.getTime();
}

export function normalizeItem(raw: RawItem, now: Date = new Date()): Product {
  const title = cleanTitle(raw.title ?? '');
  const { style, material, productType } = deriveFacets(title);
  const tags = Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).trim()).filter(Boolean) : [];

  return {
    id: String(raw.id),
    title,
    titleRaw: raw.title ?? '',
    brand: (raw.brand ?? '').trim(),
    category: (raw.category ?? '').trim(),
    material,
    productType,
    style,
    tags,
    price: Number(raw.price) || 0,
    rating: Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : 0,
    reviews: Number.isFinite(Number(raw.reviews)) ? Number(raw.reviews) : 0,
    inStock: Boolean(raw.inStock),
    releasedAt: raw.releasedAt ?? '',
    isFuture: raw.releasedAt ? isFutureDate(raw.releasedAt, now) : false,
    image: raw.image ?? '',
    imageWidth: Number(raw.imageWidth) || 0,
    imageHeight: Number(raw.imageHeight) || 0,
    description: (raw.description ?? '').trim(),
    popularity: popularityScore(Number(raw.rating) || 0, Number(raw.reviews) || 0),
  };
}

// Guard against malformed rows so one bad record cannot break the whole ingest.
export function isValidRaw(raw: unknown): raw is RawItem {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id !== 'undefined' &&
    typeof r.title === 'string' &&
    typeof r.price !== 'undefined' &&
    !Number.isNaN(Number(r.price))
  );
}
