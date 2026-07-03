import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fromRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(backendRoot, p);
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  itemsUrl:
    process.env.ITEMS_URL ??
    'https://media.downshift.app/hiring/founding-engineer/items.json',
  dbPath: fromRoot(process.env.DB_PATH ?? 'data/catalog.db'),
  rawDataPath: fromRoot('data/items.json'),
};

export type AppConfig = typeof config;
