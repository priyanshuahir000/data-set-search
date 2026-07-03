import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { databaseExists, openDatabase } from './db/connection.js';
import { SearchEngine } from './search/engine.js';
import { createApiRouter } from './routes/api.js';

function assertDatabaseReady(): void {
  if (!databaseExists()) {
    console.error('No database found. Run "npm run ingest" first to build it.');
    process.exit(1);
  }
}

function main(): void {
  assertDatabaseReady();

  const db = openDatabase();

  let engine: SearchEngine;
  try {
    engine = new SearchEngine(db);
  } catch (err) {
    console.error('Failed to initialize the search engine. Has ingest run?');
    console.error(err);
    process.exit(1);
  }

  if (engine.productCount === 0) {
    console.error('The database is empty. Run "npm run ingest" to populate it.');
    process.exit(1);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', createApiRouter(engine));

  app.get('/', (_req, res) => {
    res.json({ service: 'home-goods-discovery-api', products: engine.productCount });
  });

  app.listen(config.port, () => {
    console.log(`Search API listening on http://localhost:${config.port}`);
    console.log(`Indexed ${engine.productCount} products. Try /api/search?q=oak+lamp`);
  });
}

main();
