// The catalog titles follow a strict pattern: [style] [material] [product type].
// None of those three are given as their own field, yet product type is exactly
// what a shopper searches for ("vase", "table lamp", "area rug"). So we derive
// all three at ingest time using these closed vocabularies, which we read off the
// data itself. Anything we cannot classify falls back to a best-effort value, so
// the pipeline never drops a product.

export const MATERIALS = [
  'rattan', 'linen', 'terracotta', 'leather', 'velvet', 'bamboo', 'oak',
  'brass', 'steel', 'marble', 'ceramic', 'walnut', 'wool', 'glass',
];

export const STYLES = [
  'brushed', 'minimal', 'sculptural', 'wide', 'stackable', 'vintage', 'low',
  'compact', 'hand-thrown', 'folding', 'matte', 'faceted', 'modern', 'handwoven',
];

// Canonical product types. Multi-word entries must be matched before their
// single-word subsets, so consumers sort by word count before scanning.
export const PRODUCT_TYPES = [
  'planter box', 'cutting board', 'tea towel', 'throw blanket', 'serving tray',
  'letter tray', 'magazine rack', 'area rug', 'candle holder', 'pendant light',
  'table lamp', 'floor lamp', 'task lamp', 'desk organizer', 'storage basket',
  'garden stool', 'dining chair', 'lounge chair', 'side table', 'coffee table',
  'shelf unit', 'soap dish', 'bath mat', 'towel bar', 'wall hook', 'table runner',
  'framed print', 'watering can', 'pen holder', 'woven hanging',
  'planter', 'crate', 'bin', 'tray', 'bookend', 'bowl', 'vase', 'doormat',
  'canvas', 'lantern', 'sconce', 'bench', 'mirror', 'bookstand', 'sideboard',
  'mug', 'carafe', 'canister', 'triptych', 'poster', 'tumbler',
];

// Longest phrases first so "planter box" wins over "planter" and
// "serving tray" wins over "tray".
export const PRODUCT_TYPES_BY_LENGTH = [...PRODUCT_TYPES].sort((a, b) => {
  const wordDiff = b.split(' ').length - a.split(' ').length;
  return wordDiff !== 0 ? wordDiff : b.length - a.length;
});

export const MATERIAL_SET = new Set(MATERIALS);
export const STYLE_SET = new Set(STYLES);
