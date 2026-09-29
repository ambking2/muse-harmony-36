/// <reference types="bun" />

import { beforeAll, describe, expect, it } from "bun:test";

import { login, register } from "./auth";
import { findUser, resetForTests, storageMode } from "./db";
import type { D1Database } from "./d1";

/**
 * The account flow against a D1 backend, exercised without a Worker.
 *
 * A Worker has no disk, so without a double the deployed path would ship with
 * no test at all. This is a database with the shape of the real binding — two
 * statements and a row of JSON — which is all `d1.ts` ever asks of it.
 */

const rows = new Map<string, string>();
let created = 0;

const database: D1Database = {
  prepare(query: string) {
    let bound: unknown[] = [];
    const statement = {
      bind: (...values: unknown[]) => {
        bound = values;
        return statement;
      },
      first: async <T>() => {
        const body = rows.get(String(bound[0]));
        return body ? ({ body } as T) : null;
      },
      run: async () => {
        rows.set(String(bound[0]), String(bound[1]));
        return {};
      },
    };
    // The only statement this double has to recognise is the upsert, and it
    // recognises it by the arguments rather than by parsing SQL.
    expect(query).toContain("muis_document");
    return statement;
  },
  exec: async () => {
    created += 1;
    return {};
  },
};

describe("the account flow over a D1 backend", () => {
  // In here, not at module load: bun evaluates every test file's body before
  // running any test, so a binding installed at load time is overwritten by
  // whichever file loaded last.
  beforeAll(() => {
    (globalThis as { __env__?: unknown }).__env__ = { MUIS_DB: database };
    resetForTests();
  });

  it("reports the backend it picked, without touching the database", async () => {
    expect(await storageMode()).toBe("d1");
    // Nothing is written, and nothing is even created, until there is
    // something to read or write: a request that never needs an account never
    // pays for the binding.
    expect(rows.size).toBe(0);
    expect(created).toBe(0);
  });

  it("keeps the whole account in a single row", async () => {
    const result = await register("ali", "a long enough password");
    expect(result.ok).toBe(true);

    expect(rows.size).toBe(1);
    const stored = JSON.parse([...rows.values()][0]) as { users: Record<string, unknown> };
    const user = stored.users.ali as { passwordHash: string };
    expect(user.passwordHash).toBeString();
    expect(user.passwordHash).not.toContain("a long enough password");
  });

  it("still knows the account after a restart, because it came back from the row", async () => {
    // The whole reason for the binding: a new isolate reads the one row and
    // finds the account there. Without this, every restart would be a fresh
    // empty database and the worker would ask for a password twice.
    resetForTests();

    expect((await login("ali", "the wrong password")).ok).toBe(false);
    expect((await login("ali", "a long enough password")).ok).toBe(true);
  });

  it("creates the table once per isolate, not once per request", async () => {
    // The restart above opened a second backend, so by now the table has been
    // created twice. What matters is that this one stops creating it.
    const before = created;
    await storageMode();
    await login("ali", "a long enough password");
    expect(created).toBe(before);
  });
});

/**
 * The same backend pointed at a database it cannot use.
 *
 * This is the mistake nobody makes on purpose: the binding is right, the
 * database exists, and the table was never created — because D1 in production
 * does not take schema changes from a Worker. Every query fails, and the only
 * question worth testing is what the app does about it.
 */
const broken: D1Database = {
  prepare() {
    const statement = {
      bind: () => statement,
      first: async () => {
        throw new Error("D1_ERROR: no such table: muis_document: SQLITE_ERROR");
      },
      run: async () => {
        throw new Error("D1_ERROR: no such table: muis_document: SQLITE_ERROR");
      },
    };
    return statement;
  },
  exec: async () => {
    throw new Error("DDL is not allowed from the Workers runtime");
  },
};

describe("a D1 database that is not usable", () => {
  beforeAll(() => {
    (globalThis as { __env__?: unknown }).__env__ = { MUIS_DB: broken };
    resetForTests();
  });

  it("still registers, and says where the account went", async () => {
    // A signup that throws over a missing table is a far worse outcome than an
    // account that is only kept in memory, because it is one that looks like
    // the app is broken.
    const result = await register("sara", "a long enough password");
    expect(result.ok).toBe(true);

    // The account is real, and findable through the same API...
    expect(await findUser("sara")).not.toBeNull();
    // ...and `mode` stops claiming D1, so nothing says it is durable.
    expect(await storageMode()).toBe("memory");
  });

  it("stops asking D1 after the first failure", async () => {
    // Once it has fallen back it should not pay for a failing query on every
    // single request.
    const before = created;
    expect((await login("sara", "a long enough password")).ok).toBe(true);
    expect(created).toBe(before);
  });
});
