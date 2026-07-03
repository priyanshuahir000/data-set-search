import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export type DB = Database.Database;

export function openDatabase(): DB {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  return db;
}

export function databaseExists(): boolean {
  return fs.existsSync(config.dbPath);
}
