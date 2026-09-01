import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  password_plain: string;
};

const DB_PATH = path.join(process.cwd(), "data", "app.db");

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_plain TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      username     TEXT PRIMARY KEY,
      failures     INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER
    );
  `);
}

// Next.js reloads modules in dev, so the connection is cached on globalThis to
// avoid opening a new file handle on every hot reload.
const globalForDb = globalThis as unknown as { __appDb?: Database.Database };

export const db: Database.Database = globalForDb.__appDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__appDb = db;
}
