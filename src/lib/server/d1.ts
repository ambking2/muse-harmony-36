import type { Query, SqlValue } from "./driver";
import { SCHEMA } from "./driver";

/**
 * The database as Cloudflare D1: used by the deployed worker, which has no
 * writable disk.
 *
 * D1 is SQLite at the edge, reached through a binding rather than a connection
 * string, so the accounts are in the same Cloudflare account as the worker and
 * need no second vendor, no key and no separate billing.
 *
 * The binding types are declared here rather than pulled in from
 * `@cloudflare/workers-types`. That package describes the entire Workers runtime
 * and overlaps with the DOM and Node type sets this project already compiles
 * against; four methods were not worth a type conflict.
 */
export interface D1Statement {
  bind(...values: SqlValue[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

export interface D1Database {
  prepare(sql: string): D1Statement;
  /** Runs statements in order, in one transaction. */
  batch(statements: D1Statement[]): Promise<unknown>;
}

export function openDatabase(db: D1Database): Query {
  return {
    async one<T>(sql: string, ...args: SqlValue[]): Promise<T | null> {
      return await db
        .prepare(sql)
        .bind(...args)
        .first<T>();
    },
    async many<T>(sql: string, ...args: SqlValue[]): Promise<T[]> {
      return (
        await db
          .prepare(sql)
          .bind(...args)
          .all<T>()
      ).results;
    },
    async run(sql: string, ...args: SqlValue[]): Promise<number> {
      return (
        (
          await db
            .prepare(sql)
            .bind(...args)
            .run()
        ).meta?.changes ?? 0
      );
    },
    migrate: () => migrate(db),
  };
}

/**
 * Creates the tables the first time this isolate runs against a fresh database.
 *
 * A single lookup guards the whole batch. On D1 every statement is a round trip
 * to the edge, so paying one cheap query per cold start beats paying for six
 * `IF NOT EXISTS` clauses that will do nothing.
 */
async function migrate(db: D1Database): Promise<void> {
  const existing = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .first<{ name: string }>();
  if (existing) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
}
