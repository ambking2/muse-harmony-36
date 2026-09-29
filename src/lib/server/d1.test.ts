/// <reference types="bun" />

import { beforeAll, describe, expect, it } from "bun:test";

import { login, register } from "./auth";
import { findUser, getLibrary, resetForTests, saveLibrary, storageMode } from "./db";
import type { D1Database } from "./d1";
import type { LibraryDocument } from "../types";

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

/**
 * The library that follows an account between devices.
 *
 * It is stored in the same document as everything else, keyed by name, so the
 * thing worth testing is not the storage but the isolation: one account must
 * never see another's playlists, and a name with no library must read as
 * absent rather than as somebody else's.
 */
function library(name: string, key: string): LibraryDocument {
  return {
    library: [],
    favorites: [key],
    favoriteArtists: [name],
    history: [{ key, at: 1 }],
    searchHistory: [name],
    playlists: [
      {
        id: `${name}-list`,
        name,
        createdAt: 1,
        updatedAt: 1,
        trackKeys: [key],
      },
    ],
    tracksById: {
      [key]: {
        id: "1",
        name,
        artist: [name],
        album: "",
        pic_id: "",
        url_id: "",
        lyric_id: "",
        source: "netease",
      },
    },
  };
}

describe("the account library", () => {
  beforeAll(() => {
    (globalThis as { __env__?: unknown }).__env__ = { MUIS_DB: database };
    resetForTests();
  });

  it("is absent until the account saves one", async () => {
    await register("nima", "a long enough password");
    expect(await getLibrary("nima")).toBeNull();
  });

  it("keeps two accounts' libraries apart", async () => {
    await register("parisa", "a long enough password");
    await saveLibrary("ali", library("ali", "netease:1"));
    await saveLibrary("parisa", library("parisa", "netease:2"));

    const a = await getLibrary("ali");
    const p = await getLibrary("parisa");
    expect(a?.favorites).toEqual(["netease:1"]);
    expect(p?.favorites).toEqual(["netease:2"]);
    expect(a?.playlists[0]?.name).toBe("ali");
    expect(p?.playlists[0]?.name).toBe("parisa");
  });

  it("replaces a library rather than merging into it", async () => {
    // A playlist deleted on one device has to stay deleted on the next, which
    // is why this is a replacement and not a union.
    await saveLibrary("ali", library("ali", "netease:1"));
    const after = await getLibrary("ali");
    expect(after?.favorites).toEqual(["netease:1"]);
    expect(after?.playlists).toHaveLength(1);
  });

  it("comes back from the row after a restart", async () => {
    resetForTests();
    expect((await getLibrary("ali"))?.favorites).toEqual(["netease:1"]);
  });
});

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
