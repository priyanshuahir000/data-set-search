// The catalog vocabulary is synthetic and narrow: shoppers say "sofa", the data
// says "lounge chair"; they say "rug", the data says "area rug"; they say "wooden",
// the data says "oak" or "walnut". Without this bridge, perfectly reasonable
// searches return nothing. Each user term expands into the catalog terms it should
// also match. Multi-word values are matched as exact phrases by the query builder.
//
// This map is intentionally hand-curated and conservative. It is the single place
// to teach the search new shopper language, and it is easy to review.
export const SYNONYMS: Record<string, string[]> = {
  // Seating and soft furniture
  sofa: ['lounge chair', 'bench'],
  couch: ['lounge chair', 'bench'],
  settee: ['lounge chair', 'bench'],
  seat: ['dining chair', 'lounge chair', 'bench', 'garden stool'],
  chair: ['dining chair', 'lounge chair', 'garden stool'],
  stool: ['garden stool'],
  pillow: ['throw blanket'],
  cushion: ['throw blanket'],
  blanket: ['throw blanket'],
  throw: ['throw blanket'],

  // Floor and surfaces
  rug: ['area rug'],
  carpet: ['area rug'],
  mat: ['doormat', 'bath mat'],

  // Lighting
  lamp: ['table lamp', 'floor lamp', 'task lamp', 'pendant light', 'sconce', 'lantern'],
  light: ['pendant light', 'table lamp', 'floor lamp', 'sconce', 'lantern'],
  lighting: ['pendant light', 'table lamp', 'floor lamp', 'sconce', 'lantern'],

  // Wall and art
  art: ['framed print', 'poster', 'canvas', 'triptych'],
  print: ['framed print', 'poster'],
  picture: ['framed print', 'poster', 'canvas'],
  painting: ['canvas', 'framed print'],
  frame: ['framed print'],

  // Plants and storage
  pot: ['planter', 'planter box'],
  plant: ['planter', 'planter box'],
  planter: ['planter box'],
  basket: ['storage basket', 'crate'],
  storage: ['storage basket', 'crate', 'bin', 'shelf unit'],
  shelf: ['shelf unit'],
  shelving: ['shelf unit'],

  // Tables and desks
  table: ['side table', 'coffee table', 'sideboard'],
  desk: ['desk organizer'],
  organizer: ['desk organizer', 'letter tray'],
  organiser: ['desk organizer', 'letter tray'],

  // Kitchen and dining
  cup: ['tumbler', 'mug'],
  mug: ['tumbler'],
  jug: ['carafe', 'watering can'],
  pitcher: ['carafe'],
  board: ['cutting board'],
  towel: ['tea towel', 'towel bar', 'bath mat'],

  // Materials expressed in everyday words
  wood: ['oak', 'walnut', 'bamboo', 'rattan'],
  wooden: ['oak', 'walnut', 'bamboo', 'rattan'],
  metal: ['steel', 'brass'],
  metallic: ['steel', 'brass'],
  stone: ['marble', 'terracotta'],
  fabric: ['linen', 'wool', 'velvet'],
  cloth: ['linen', 'wool'],

  // Style expressed in everyday words
  handmade: ['handwoven', 'hand-thrown'],
  handcrafted: ['handwoven', 'hand-thrown'],
  minimalist: ['minimal'],
  rustic: ['vintage'],
  antique: ['vintage'],
};
