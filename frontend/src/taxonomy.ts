// Design taxonomy + visual maps, mined from the prototype's catalog.js.
// The real API already returns the same category / productType / material
// vocabularies, so these maps assign each value its icon, tint, ink, and swatch.
// The mock search engine from catalog.js is intentionally NOT ported — the real
// backend does that work.
import type { Product } from './types';

export interface CategoryDef {
  name: string;
  tint: string; // media / tile background
  ink: string; // filled icon color on the tint
  icon: string; // Material Symbols Rounded ligature
  subs: string[]; // ordered subcategories (productType values)
}

// Order here drives the category strip / tab bar and subcategory ordering.
export const CATEGORIES: CategoryDef[] = [
  { name: 'Lighting', tint: '#FFF3DE', ink: '#B77914', icon: 'lightbulb', subs: ['Pendant Light', 'Table Lamp', 'Floor Lamp', 'Task Lamp', 'Lantern', 'Sconce'] },
  { name: 'Kitchen', tint: '#E6F6EB', ink: '#178A45', icon: 'countertops', subs: ['Cutting Board', 'Serving Tray', 'Bowl', 'Mug', 'Carafe', 'Canister'] },
  { name: 'Furniture', tint: '#F3EEE4', ink: '#997743', icon: 'chair', subs: ['Dining Chair', 'Lounge Chair', 'Side Table', 'Coffee Table', 'Shelf Unit', 'Bench', 'Sideboard'] },
  { name: 'Textiles', tint: '#FCEBEF', ink: '#C05877', icon: 'dry_cleaning', subs: ['Tea Towel', 'Throw Blanket', 'Area Rug', 'Table Runner', 'Bath Mat'] },
  { name: 'Storage', tint: '#E9F0FB', ink: '#4A6FB5', icon: 'inventory_2', subs: ['Crate', 'Bin', 'Magazine Rack', 'Storage Basket', 'Wall Hook'] },
  { name: 'Bath', tint: '#E4F5F6', ink: '#2A90A2', icon: 'bathtub', subs: ['Soap Dish', 'Towel Bar', 'Bath Mat', 'Tumbler'] },
  { name: 'Decor', tint: '#F1EBFA', ink: '#7B58BE', icon: 'local_florist', subs: ['Vase', 'Candle Holder', 'Bookend', 'Mirror', 'Planter'] },
  { name: 'Office', tint: '#ECEFF2', ink: '#5B6875', icon: 'edit', subs: ['Desk Organizer', 'Letter Tray', 'Pen Holder', 'Bookstand'] },
  { name: 'Outdoor', tint: '#E8F6E4', ink: '#4C9C3B', icon: 'yard', subs: ['Planter Box', 'Garden Stool', 'Doormat', 'Watering Can'] },
  { name: 'Wall Art', tint: '#FBEEE1', ink: '#C4793A', icon: 'image', subs: ['Framed Print', 'Canvas', 'Poster', 'Woven Hanging', 'Triptych'] },
];

export const CATEGORY_BY_NAME: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c]),
);

// productType -> Material Symbols Rounded ligature for the placeholder tile.
const TYPE_ICON: Record<string, string> = {
  'Pendant Light': 'light', 'Table Lamp': 'table_lamp', 'Floor Lamp': 'floor_lamp', 'Task Lamp': 'wb_incandescent', 'Lantern': 'emoji_objects', 'Sconce': 'wall_lamp',
  'Cutting Board': 'countertops', 'Serving Tray': 'room_service', 'Bowl': 'ramen_dining', 'Mug': 'local_cafe', 'Carafe': 'local_bar', 'Canister': 'coffee', 'Tumbler': 'local_cafe',
  'Dining Chair': 'chair', 'Lounge Chair': 'chair', 'Garden Stool': 'chair', 'Side Table': 'table_restaurant', 'Coffee Table': 'table_restaurant', 'Shelf Unit': 'shelves', 'Sideboard': 'shelves', 'Bench': 'weekend',
  'Crate': 'inventory_2', 'Bin': 'delete', 'Magazine Rack': 'auto_stories', 'Storage Basket': 'shopping_basket', 'Wall Hook': 'push_pin',
  'Tea Towel': 'dry_cleaning', 'Throw Blanket': 'bed', 'Area Rug': 'texture', 'Table Runner': 'dry_cleaning', 'Bath Mat': 'texture',
  'Soap Dish': 'soap', 'Towel Bar': 'dry_cleaning',
  'Vase': 'local_florist', 'Candle Holder': 'local_fire_department', 'Bookend': 'menu_book', 'Mirror': 'crop_portrait', 'Planter': 'potted_plant',
  'Desk Organizer': 'inventory_2', 'Letter Tray': 'inbox', 'Pen Holder': 'edit', 'Bookstand': 'menu_book',
  'Planter Box': 'yard', 'Doormat': 'texture', 'Watering Can': 'water_drop',
  'Framed Print': 'image', 'Canvas': 'image', 'Poster': 'wallpaper', 'Woven Hanging': 'wallpaper', 'Triptych': 'photo_library',
};

// The DB derives productType lowercase ("table lamp"); the maps above are keyed
// by the Title Case names from the design. Normalize on lookup so either works.
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
export function typeIcon(t: string): string {
  return TYPE_ICON[t] || TYPE_ICON[titleCase(t)] || 'inventory_2';
}
export function typeLabel(t: string): string {
  return TYPE_ICON[t] ? t : titleCase(t);
}
export function categoryIcon(n: string): string {
  return CATEGORY_BY_NAME[n]?.icon ?? 'category';
}
export function categoryInk(n: string): string {
  return CATEGORY_BY_NAME[n]?.ink ?? '#0A7A32';
}
export function categoryTint(n: string): string {
  return CATEGORY_BY_NAME[n]?.tint ?? '#F2F5F2';
}
export function categoryOfType(type: string): string | null {
  const t = typeLabel(type);
  return CATEGORIES.find((c) => c.subs.includes(t))?.name ?? null;
}

// Material color swatches for the filter chips.
export const MATERIAL_SWATCH: Record<string, string> = {
  Rattan: '#C89B6B', Linen: '#E4DCC8', Terracotta: '#C06A44', Leather: '#8A5A3B',
  Velvet: '#6B3FA0', Bamboo: '#C7B36A', Oak: '#B98A50', Brass: '#C79A3A',
  Steel: '#8A9299', Marble: '#ECEBE7', Ceramic: '#E5DECF', Walnut: '#5E4630',
  Wool: '#D8CDBA', Glass: '#BBD6DC',
};
export function materialSwatch(m: string): string {
  return MATERIAL_SWATCH[m] || MATERIAL_SWATCH[titleCase(m)] || '#CFCFC7';
}

// Brand monogram palette (bg / ink), hashed from the brand name.
const BRAND_PALETTE: [string, string][] = [
  ['#EAF6EE', '#0A7A32'], ['#FFF3DE', '#B77914'], ['#F1EBFA', '#7B58BE'],
  ['#E9F0FB', '#4A6FB5'], ['#FCEBEF', '#C05877'], ['#E4F5F6', '#2A90A2'],
];
export function brandColors(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return BRAND_PALETTE[h % BRAND_PALETTE.length]!;
}
export function monogram(name: string): string {
  return (name.match(/[A-Za-z]/)?.[0] ?? '?').toUpperCase();
}

// Home showcases individual product types (the things with many options), à la
// Zepto's "Rice" / "Laundry Care" rails — not the top-level categories. The first
// few are curated; HOME_SECTION_TYPES then lists every product type so the home
// can lazily reveal a section per type as the shopper scrolls.
export const HOME_TYPE_RAILS = [
  'Table Lamp', 'Vase', 'Dining Chair', 'Area Rug', 'Serving Tray', 'Storage Basket',
];

const ALL_SUBS_ORDERED: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of HOME_TYPE_RAILS) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  for (const c of CATEGORIES) {
    for (const s of c.subs) {
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  return out;
})();

// Every product type, curated ones first, each shown as its own home section.
export const HOME_SECTION_TYPES = ALL_SUBS_ORDERED;

export const TRENDING = [
  'Table lamp', 'Oak', 'Vase under 300', 'Area rug', 'Lounge chair', 'Marble', 'Storage', 'Pendant light',
];

// --- formatting ---------------------------------------------------------------
export const money = (n: number): string => '$' + Math.round(n).toLocaleString('en-US');
export const compact = (n: number): string =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n);
export function plural(w: string): string {
  if (/[sx]$|ch$|sh$/i.test(w)) return w + 'es';
  if (/[^aeiou]y$/i.test(w)) return w.replace(/y$/, 'ies');
  return w + 's';
}

// --- fabricated fields (see the handoff) --------------------------------------
// The real catalog has no compare-at price. To reproduce the design's
// strikethrough MRP + "$X OFF" treatment we derive a stable MRP per product,
// mirroring the prototype's `price × (1.18–1.73)`. Deterministic from the id so
// it never flickers. Remove this + its two call sites to drop the discount row.
export function deriveMrp(p: Product): number {
  let h = 0;
  const key = String(p.id);
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const factor = 1.18 + ((h % 1000) / 1000) * 0.55;
  return Math.round(p.price * factor);
}

// --- card state ---------------------------------------------------------------
export type BadgeKind = 'bestseller' | 'coming' | 'out' | null;
export function badgeFor(p: Product): BadgeKind {
  if (isBestseller(p)) return 'bestseller';
  if (p.isFuture) return 'coming';
  if (!p.inStock) return 'out';
  return null;
}
// Derived, since the real schema has no bestseller flag: a strongly reviewed,
// well rated, available product.
export function isBestseller(p: Product): boolean {
  return p.inStock && !p.isFuture && p.reviews >= 2600 && p.rating >= 4.4;
}
export function isNew(p: Product): boolean {
  return p.reviews === 0 && p.inStock && !p.isFuture;
}
