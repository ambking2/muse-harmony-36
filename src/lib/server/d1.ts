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
 * migration to have been run first. It is an attempt and not a promise: a
 * production D1 is free to refuse schema changes from inside a Worker, and
 * `migrations/0001_document.sql` is the same statement for anyone who would
 * rather run it up front. When the create does not happen, the caller hears
 * about it and keeps accounts in memory rather than serving a SQL error.
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

/**
 * One line, on purpose.
 *
 * `exec()` takes a statement, not a script: given the same CREATE spread over
 * four lines it answers "incomplete input" and the app carries on believing it
 * has a table. The readable version of this statement is migrations/0001_document.sql.
 */
const CREATE = `CREATE TABLE IF NOT EXISTS ${TABLE} (id TEXT PRIMARY KEY, body TEXT NOT NULL, updated_at INTEGER NOT NULL)`;

const SELECT = `SELECT body FROM ${TABLE} WHERE id = ?`;

const UPSERT = `INSERT INTO ${TABLE} (id, body, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`;

export function openBackend(
  database: D1Database,
  onFailure?: (error: unknown) => void,
): DocumentBackend {
  let created: Promise<unknown> | null = null;

  /**
   * Once per isolate, and never fatally.
   *
   * D1 in production is happy to refuse schema changes from a Worker, so this
   * is a convenience and not a guarantee — which is why a refusal is logged
   * rather than swallowed. When it does not work, the reason is on the console
   * and the caller falls back to memory instead of serving a SQL error.
   */
  const ensureTable = (): Promise<unknown> => {
    created ??= (database.exec ? database.exec(CREATE) : database.prepare(CREATE).run()).catch(
      (error: unknown) => {
        console.error(
          "muis: could not create the D1 table from the app; run migrations/0001_document.sql",
          error,
        );
        return null;
      },
    );
    return created;
  };

  const guard = async <T>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      onFailure?.(error);
      throw error;
    }
  };

  return {
    read: () =>
      guard(async () => {
        await ensureTable();
        const row = await database.prepare(SELECT).bind(KEY).first<{ body: string }>();
        return row?.body ? (JSON.parse(row.body) as Snapshot) : null;
      }),
    write: (snapshot) =>
      guard(async () => {
        await ensureTable();
        await database.prepare(UPSERT).bind(KEY, JSON.stringify(snapshot), Date.now()).run();
      }),
  };
}
