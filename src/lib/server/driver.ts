/**
 * The contract a database backend has to satisfy, and the schema itself.
 *
 * The accounts live in a SQLite database, and there are two places it can be.
 * The deployed Cloudflare worker has no disk, so there it is a D1 binding; in
 * development and the preview it is a file. Both are wrapped in this one shape
 * so `db.ts` holds a single copy of every query and neither backend can drift
 * from the other.
 */

/** What SQLite can bind. Booleans are passed as 0/1 by the callers. */
export type SqlValue = string | number | null;

export interface Query {
  /** The first matching row, or null. */
  one<T>(sql: string, ...args: SqlValue[]): Promise<T | null>;
  /** Every matching row. */
  many<T>(sql: string, ...args: SqlValue[]): Promise<T[]>;
  /** Runs a write and resolves to the number of rows it changed. */
  run(sql: string, ...args: SqlValue[]): Promise<number>;
  /** Brings the database up to date. Idempotent, so it runs on every cold start. */
  migrate(): Promise<void>;
}

/**
 * One statement per entry, not one script: D1 allows a single statement per
 * prepared query, and the file driver runs these joined together.
 *
 * Every statement is `IF NOT EXISTS` so that losing the race against another
 * isolate — or restarting against an existing file — is not an error.
 */
export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
     username        TEXT PRIMARY KEY,
     password_hash   TEXT NOT NULL,
     salt            TEXT NOT NULL,
     recovery_hashes TEXT NOT NULL,
     created_at      INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     sid        TEXT PRIMARY KEY,
     username   TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
     created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_username ON sessions (username)`,
  `CREATE TABLE IF NOT EXISTS playlists (
     id         TEXT PRIMARY KEY,
     owner      TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
     name       TEXT NOT NULL,
     is_public  INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     tracks     TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS playlists_owner ON playlists (owner)`,
];
