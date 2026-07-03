import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { openDatabase } from '../db/connection.js';
import { RESET_SQL, SCHEMA_SQL } from '../db/schema.js';
import type { Product, RawItem } from '../types.js';
import { tokenize } from '../search/text.js';
import { isValidRaw, normalizeItem } from './normalize.js';

/**
 * Ingest pipeline.
 *
 *   npm run ingest              fetch (or reuse cached) items.json, build the DB
 *   npm run ingest -- --refresh force a fresh download
 *   npm run ingest -- ./file.json  ingest a specific local file
 *
 * The database is dropped and rebuilt every run, so it is always reproducible
 * from the source data.
 */

async function loadRawItems(): Promise<RawItem[]> {
  const args = process.argv.slice(2);
  const refresh = args.includes('--refresh');
  const fileArg = args.find((a) => !a.startsWith('--'));

  if (fileArg) {
    console.log(`Reading catalog from ${fileArg}`);
    return JSON.parse(fs.readFileSync(fileArg, 'utf8'));
  }

  if (!refresh && fs.existsSync(config.rawDataPath)) {
    console.log(`Reading cached catalog from ${config.rawDataPath}`);
    return JSON.parse(fs.readFileSync(config.rawDataPath, 'utf8'));
  }

  console.log(`Fetching catalog from ${config.itemsUrl}`);
  const res = await fetch(config.itemsUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch catalog: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  fs.mkdirSync(path.dirname(config.rawDataPath), { recursive: true });
  fs.writeFileSync(config.rawDataPath, text);
  return JSON.parse(text);
}

function buildLexicon(products: Product[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const p of products) {
    const text = [
      p.title,
      p.productType,
      p.material,
      p.style,
      p.brand,
      p.category,
      p.tags.join(' '),
      p.description,
    ].join(' ');
    for (const term of tokenize(text)) {
      freq.set(term, (freq.get(term) ?? 0) + 1);
    }
  }
  return freq;
}

async function main(): Promise<void> {
  const start = Date.now();
  const rawItems = await loadRawItems();
  if (!Array.isArray(rawItems)) {
    throw new Error('Expected the catalog to be a JSON array of items.');
  }

  const now = new Date();
  const products: Product[] = [];
  let skipped = 0;
  for (const raw of rawItems) {
    if (!isValidRaw(raw)) {
      skipped += 1;
      continue;
    }
    products.push(normalizeItem(raw, now));
  }

  const db = openDatabase();
  db.exec(RESET_SQL);
  db.exec(SCHEMA_SQL);

  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, title, title_raw, brand, category, material, product_type, style, tags,
      price, rating, reviews, in_stock, released_at, is_future,
      image, image_width, image_height, description, popularity
    ) VALUES (
      @id, @title, @titleRaw, @brand, @category, @material, @productType, @style, @tags,
      @price, @rating, @reviews, @inStock, @releasedAt, @isFuture,
      @image, @imageWidth, @imageHeight, @description, @popularity
    )
  `);

  const insertFts = db.prepare(`
    INSERT INTO products_fts (
      product_id, title, product_type, material, brand, category, tags, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLexicon = db.prepare('INSERT OR REPLACE INTO lexicon (term, freq) VALUES (?, ?)');

  const writeAll = db.transaction((rows: Product[]) => {
    for (const p of rows) {
      insertProduct.run({
        id: p.id,
        title: p.title,
        titleRaw: p.titleRaw,
        brand: p.brand,
        category: p.category,
        material: p.material,
        productType: p.productType,
        style: p.style,
        tags: JSON.stringify(p.tags),
        price: p.price,
        rating: p.rating,
        reviews: p.reviews,
        inStock: p.inStock ? 1 : 0,
        releasedAt: p.releasedAt,
        isFuture: p.isFuture ? 1 : 0,
        image: p.image,
        imageWidth: p.imageWidth,
        imageHeight: p.imageHeight,
        description: p.description,
        popularity: p.popularity,
      });
      insertFts.run(
        p.id,
        p.title,
        p.productType,
        p.material,
        p.brand,
        p.category,
        p.tags.join(' '),
        p.description,
      );
    }

    const lexicon = buildLexicon(rows);
    for (const [term, freq] of lexicon) {
      insertLexicon.run(term, freq);
    }
  });

  writeAll(products);

  // Optimize the FTS index so the first queries after ingest are fast.
  db.exec("INSERT INTO products_fts(products_fts) VALUES('optimize')");
  db.exec('ANALYZE');

  const categories = db.prepare('SELECT COUNT(DISTINCT category) AS n FROM products').get() as { n: number };
  const brands = db.prepare('SELECT COUNT(DISTINCT brand) AS n FROM products').get() as { n: number };
  const materials = db.prepare("SELECT COUNT(DISTINCT material) AS n FROM products WHERE material <> ''").get() as { n: number };
  const types = db.prepare("SELECT COUNT(DISTINCT product_type) AS n FROM products WHERE product_type <> ''").get() as { n: number };
  const future = db.prepare('SELECT COUNT(*) AS n FROM products WHERE is_future = 1').get() as { n: number };
  const lexSize = db.prepare('SELECT COUNT(*) AS n FROM lexicon').get() as { n: number };

  db.close();

  console.log('');
  console.log('Ingest complete');
  console.log(`  products indexed : ${products.length}`);
  console.log(`  skipped (invalid): ${skipped}`);
  console.log(`  categories       : ${categories.n}`);
  console.log(`  brands           : ${brands.n}`);
  console.log(`  materials        : ${materials.n}`);
  console.log(`  product types    : ${types.n}`);
  console.log(`  future-dated     : ${future.n} (shown as "coming soon")`);
  console.log(`  lexicon terms    : ${lexSize.n}`);
  console.log(`  database         : ${config.dbPath}`);
  console.log(`  took             : ${Date.now() - start} ms`);
}

main().catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
