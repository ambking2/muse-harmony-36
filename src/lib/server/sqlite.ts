import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { DatabaseSync } from "node:sqlite";

/**
 * The SQLite file itself: opened, tuned and schema-created.
 *
 * This is the only module that touches `node:fs` and `node:sqlite`, and it is
 * reached only through a dynamic `import()` from `db.ts`. That indirection is
 * what lets the account routes keep loading on Cloudflare Workers, where those
 * two builtins do not exist at all — a static import would fail the whole route
 * at module-resolution time instead of letting `isDurable()` report the truth.
 *
 * The file lives at `.data/muis.sqlite`, resolved from the working directory.
 * The dev server, the preview and the built server are all started from the
 * project root, and that is also the one place the data is a file the user can
 * find, back up or delete by hand.
 */
const DATA_DIR = join(process.cwd(), ".data");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    username       TEXT PRIMARY KEY,
    password_hash  TEXT NOT NULL,
    salt           TEXT NOT NULL,
    recovery_hashes TEXT NOT NULL,
    created_at     INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid        TEXT PRIMARY KEY,
    username   TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_username ON sessions (username);
  CREATE TABLE IF NOT EXISTS playlists (
    id         TEXT PRIMARY KEY,
    owner      TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    is_public  INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    tracks     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS playlists_owner ON playlists (owner);
`;

/**
 * Opens the file, creating the directory and the tables if they are not there.
 *
 * Every statement is `IF NOT EXISTS`, so this runs on first use and is safe to
 * run again after a restart.
 */
export function openDatabase(): DatabaseSync {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(join(DATA_DIR, "muis.sqlite"));
  // WAL means a crash mid-write rolls back to the last complete transaction
  // rather than leaving a half-written page, and FULL synchronous means a write
  // has actually reached the disk before the request that made it reports
  // success. Busy reads wait instead of failing, since several requests can
  // arrive together.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = FULL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
