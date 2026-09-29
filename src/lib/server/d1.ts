import type { DocumentBackend, Snapshot } from "./document";

/**
 * The database as one JSON value in a Cloudflare D1 table.
 *
 * Same idea as the KV backend, one storage service further along: the whole
 * document is a single value in a single row, so there is no schema to design,
 * no query to get wrong, and no code path here that the file backend does not
 * already have. A Worker has no disk, so without a binding like this an account
 * lives only as long as the isolate that accepted it.
 *
 * The row is created on first use rather than demanded as a setup step, because
 * a database that is one `CREATE TABLE` away from working should not need a
 * migration to have been run first — and because a binding pointed at an empty
 * database is a normal state, not a mistake. `migrations/0001_document.sql` is
 * the same statement for anyone who would rather run it up front.
 */
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  /** Runs DDL. Present on the real binding, optional here so a double can skip it. */
  exec?(query: string): Promise<unknown>;
}

const TABLE = "muis_document";
const KEY = "muis";

const CREATE = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`;

const SELECT = `SELECT body FROM ${TABLE} WHERE id = ?`;

const UPSERT = `INSERT INTO ${TABLE} (id, body, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`;

export function openBackend(database: D1Database): DocumentBackend {
  let created: Promise<unknown> | null = null;

  /**
   * Once per isolate, and never fatally: a database that refuses the statement
   * will say so properly on the first read or write, which is a far better
   * error than a silent "no such table" from somewhere else.
   */
  const ensureTable = (): Promise<unknown> => {
    created ??= (database.exec ? database.exec(CREATE) : database.prepare(CREATE).run()).catch(
      () => null,
    );
    return created;
  };

  return {
    read: async () => {
      await ensureTable();
      const row = await database.prepare(SELECT).bind(KEY).first<{ body: string }>();
      return row?.body ? (JSON.parse(row.body) as Snapshot) : null;
    },
    write: async (snapshot) => {
      await ensureTable();
      await database.prepare(UPSERT).bind(KEY, JSON.stringify(snapshot), Date.now()).run();
    },
  };
}
