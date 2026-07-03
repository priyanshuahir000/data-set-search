import type { SortKey } from '../types.js';

// Soft constraints are read out of the query text itself. They do not hard filter
// the results. Instead the engine ranks on the remaining words and then floats the
// items that satisfy these constraints to the top, leaving the rest below a
// labeled divider. That way "towel under 200" leads with towels under 200 without
// hiding the towel that costs 210.
export interface SoftConstraints {
  maxPrice?: number;
  minPrice?: number;
  minRating?: number;
  inStock?: boolean;
}

export interface IntentChip {
  type: 'price' | 'rating' | 'stock' | 'sort';
  label: string;
}

export interface QueryIntent {
  text: string; // the query with the understood phrases removed
  soft: SoftConstraints;
  sortHint?: SortKey;
  chips: IntentChip[];
}

const toNumber = (s: string): number => Number(s.replace(/[,$\s]/g, ''));
const money = (n: number): string => '$' + Math.round(n).toLocaleString();

/**
 * Read shopper intent out of a raw query. Handles, among others:
 *   under / below / less than / cheaper than / up to N   -> max price
 *   over / above / more than / at least N                -> min price
 *   between N and M   /   $N to $M   /   $N-$M           -> price range
 *   around / about N                                     -> price range near N
 *   N star / N+ stars                                    -> min rating
 *   top rated / highly rated / best reviewed             -> sort by rating
 *   cheap / affordable / budget                          -> sort by price ascending
 *   premium / luxury / high end                          -> sort by price descending
 *   newest / latest / new arrivals                       -> sort by newest
 *   in stock / available                                 -> in stock first
 */
export function parseIntent(raw: string): QueryIntent {
  let text = ` ${raw.toLowerCase()} `;
  const soft: SoftConstraints = {};
  const chips: IntentChip[] = [];
  let sortHint: SortKey | undefined;

  const cut = (match: RegExpExecArray | null): boolean => {
    if (!match) return false;
    text = (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length));
    return true;
  };

  // Price range first, so "between 100 and 300" is not caught by the "over" rule.
  const between =
    /\bbetween\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:and|to|-)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)/.exec(text) ||
    /\$\s*(\d[\d,]*(?:\.\d+)?)\s*(?:to|-)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)/.exec(text);
  if (between) {
    const a = toNumber(between[1]!);
    const b = toNumber(between[2]!);
    soft.minPrice = Math.min(a, b);
    soft.maxPrice = Math.max(a, b);
    chips.push({ type: 'price', label: `${money(soft.minPrice)} to ${money(soft.maxPrice)}` });
    cut(between);
  } else {
    const around = /\b(?:around|about|approx(?:imately)?|~)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)/.exec(text);
    if (around) {
      const n = toNumber(around[1]!);
      soft.minPrice = Math.round(n * 0.8);
      soft.maxPrice = Math.round(n * 1.2);
      chips.push({ type: 'price', label: `around ${money(n)}` });
      cut(around);
    } else {
      const under =
        /\b(?:under|below|less than|cheaper than|no more than|up to|upto|within|max)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)/.exec(
          text,
        );
      if (under) {
        soft.maxPrice = toNumber(under[1]!);
        chips.push({ type: 'price', label: `under ${money(soft.maxPrice)}` });
        cut(under);
      }
      const over =
        /\b(?:over|above|more than|at least|starting at|min)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)/.exec(text);
      if (over) {
        soft.minPrice = toNumber(over[1]!);
        chips.push({ type: 'price', label: `over ${money(soft.minPrice)}` });
        cut(over);
      }
    }
  }

  // Rating threshold, e.g. "4 stars", "4+ stars", "4.5 star and up".
  const rating = /\b(\d(?:\.\d)?)\s*\+?\s*stars?\b(?:\s*(?:and up|and above|plus|or better))?/.exec(text);
  if (rating) {
    soft.minRating = Math.min(5, Number(rating[1]));
    chips.push({ type: 'rating', label: `${soft.minRating}+ stars` });
    cut(rating);
  }

  const topRated =
    /\b(?:top[-\s]?rated|highly[-\s]?rated|best[-\s]?rated|well[-\s]?reviewed|best[-\s]?selling|great reviews|good reviews)\b/.exec(
      text,
    );
  if (topRated) {
    sortHint = 'rating';
    chips.push({ type: 'sort', label: 'top rated' });
    cut(topRated);
  }

  const cheap = /\b(?:cheapest|cheap|affordable|budget|inexpensive|lowest price)\b/.exec(text);
  if (cheap) {
    if (!sortHint) sortHint = 'price_asc';
    chips.push({ type: 'sort', label: 'lowest price' });
    cut(cheap);
  }

  const premium = /\b(?:premium|luxury|luxurious|high[-\s]?end|expensive|designer)\b/.exec(text);
  if (premium) {
    if (!sortHint) sortHint = 'price_desc';
    chips.push({ type: 'sort', label: 'premium' });
    cut(premium);
  }

  const newest = /\b(?:newest|latest|new arrivals?|most recent|recently added)\b/.exec(text);
  if (newest) {
    if (!sortHint) sortHint = 'newest';
    chips.push({ type: 'sort', label: 'newest' });
    cut(newest);
  }

  const stock = /\b(?:in[-\s]?stock|available(?:\s+now)?)\b/.exec(text);
  if (stock) {
    soft.inStock = true;
    chips.push({ type: 'stock', label: 'in stock' });
    cut(stock);
  }

  // Remove filler left behind by the phrases above.
  text = text
    .replace(/\b(?:dollars?|usd|bucks|priced?|price|cost(?:ing)?|only|please|that are|that is|which are)\b/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { text, soft, sortHint, chips };
}

// The label shown on the results divider, built from the hard-numeric constraints.
export function constraintLabel(soft: SoftConstraints): string {
  const parts: string[] = [];
  if (soft.minPrice != null && soft.maxPrice != null) {
    parts.push(`${money(soft.minPrice)} to ${money(soft.maxPrice)}`);
  } else if (soft.maxPrice != null) {
    parts.push(`under ${money(soft.maxPrice)}`);
  } else if (soft.minPrice != null) {
    parts.push(`over ${money(soft.minPrice)}`);
  }
  if (soft.minRating != null) parts.push(`${soft.minRating}+ stars`);
  if (soft.inStock) parts.push('in stock');
  return parts.join(' and ');
}

export function hasSoftConstraints(soft: SoftConstraints): boolean {
  return (
    soft.maxPrice != null || soft.minPrice != null || soft.minRating != null || soft.inStock != null
  );
}
