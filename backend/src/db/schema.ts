// Schema kept in code (not a separate .sql file) so it travels with the build
// and there is no runtime path resolution to get wrong.

// Full-text index notes:
//  - We use a standalone FTS5 table with product_id UNINDEXED so we can match
//    text and read back the id without a rowid coupling to the products table.
//  - The 'porter' wrapper stems tokens (towels -> towel, hanging -> hang), which
//    matters because titles and user queries mix singular and plural forms.
//  - prefix = '2 3' builds prefix indexes so as-you-type queries (oak*) stay fast.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  title_raw    TEXT NOT NULL,
  brand        TEXT NOT NULL,
  category     TEXT NOT NULL,
  material     TEXT NOT NULL DEFAULT '',
  product_type TEXT NOT NULL DEFAULT '',
  style        TEXT NOT NULL DEFAULT '',
  tags         TEXT NOT NULL DEFAULT '[]',
  price        REAL NOT NULL,
  rating       REAL NOT NULL,
  reviews      INTEGER NOT NULL,
  in_stock     INTEGER NOT NULL,
  released_at  TEXT,
  is_future    INTEGER NOT NULL DEFAULT 0,
  image        TEXT,
  image_width  INTEGER,
  image_height INTEGER,
  description  TEXT NOT NULL DEFAULT '',
  popularity   REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_material ON products(material);
CREATE INDEX IF NOT EXISTS idx_products_type     ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_price    ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating   ON products(rating);
CREATE INDEX IF NOT EXISTS idx_products_instock  ON products(in_stock);

CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  product_id UNINDEXED,
  title,
  product_type,
  material,
  brand,
  category,
  tags,
  description,
  tokenize = 'porter unicode61',
  prefix = '2 3'
);

CREATE TABLE IF NOT EXISTS lexicon (
  term TEXT PRIMARY KEY,
  freq INTEGER NOT NULL
);
`;

// Dropped and rebuilt on every ingest so a re-run always yields a clean database.
export const RESET_SQL = `
DROP TABLE IF EXISTS products_fts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS lexicon;
`;
