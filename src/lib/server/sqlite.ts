import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { DatabaseSync } from "node:sqlite";

import type { Query, SqlValue } from "./driver";
import { SCHEMA } from "./driver";

/**
 * The database as a file on disk: used in development and in the preview.
 *
 * This is the only module that touches `node:fs` and `node:sqlite`, and
 * `db.ts` reaches it through a dynamic `import()`. That indirection is what
 * lets the account routes keep loading on Cloudflare Workers, where those two
 * builtins do not exist at all — a static import would fail the whole route at
 * module-resolution time instead of letting the D1 driver take over.
 *
 * The file lives at `.data/muis.sqlite`, resolved from the working directory.
 * The dev server, the preview and the built server are all started from the
 * project root, and that is also the one place the data is a file the user can
 * find, back up or delete by hand.
 */
const DATA_DIR = join(process.cwd(), ".data");

export function openDatabase(): Query {
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

  return {
    async one<T>(sql: string, ...args: SqlValue[]): Promise<T | null> {
      return (db.prepare(sql).get(...args) as T | undefined) ?? null;
    },
    async many<T>(sql: string, ...args: SqlValue[]): Promise<T[]> {
      return db.prepare(sql).all(...args) as T[];
    },
    async run(sql: string, ...args: SqlValue[]): Promise<number> {
      return Number(db.prepare(sql).run(...args).changes);
    },
    async migrate(): Promise<void> {
      db.exec(SCHEMA.join(";\n"));
    },
  };
}
