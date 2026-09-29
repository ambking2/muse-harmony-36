/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { currentUser, login, recover, register } from "./auth";
import {
  deletePlaylist,
  findPlaylist,
  insertPlaylist,
  isDurable,
  listPlaylistsByOwner,
  resetForTests,
} from "./db";
import type { D1Database } from "./d1";
import type { StoredPlaylist } from "./types";

/**
 * The D1 driver, exercised without a worker.
 *
 * D1 is the database the deployed worker actually uses, and it is the one path
 * that a preview or a local file can never cover — it only exists where there is
 * a binding. So it is stood up here on top of `node:sqlite`, wrapped in the same
 * `prepare`/`bind`/`first`/`all`/`run`/`batch` shape, and installed on
 * `globalThis.__env__` exactly where the Cloudflare entry point puts it.
 *
 * The double is deliberately literal about D1's error text. That text is what
 * `isDuplicateName` in db.ts matches on, and it is the part a naive fake would
 * get wrong and leave untested.
 */

const dir = mkdtempSync(join(tmpdir(), "muis-d1-"));
const file = new DatabaseSync(join(dir, "test.sqlite"));

function d1Error(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  // D1 prefixes SQLite's message and appends the extended result code.
  const extended = message.includes("constraint") ? ": SQLITE_CONSTRAINT" : "";
  return new Error(`D1_ERROR: ${message}${extended}`);
}

const binding: D1Database = {
  prepare(sql: string) {
    const build = (values: (string | number | null)[]) => ({
      bind: (...next: (string | number | null)[]) => build(values.concat(next)),
      first: async () => (file.prepare(sql).get(...values) ?? null) as never,
      all: async () => ({ results: file.prepare(sql).all(...values) as never[] }),
      run: async () => {
        try {
          return { meta: { changes: Number(file.prepare(sql).run(...values).changes) } };
        } catch (err) {
          throw d1Error(err);
        }
      },
    });
    return build([]) as never;
  },
  // D1 runs a batch in one transaction, in order.
  batch: async (statements) => {
    for (const statement of statements) await statement.run();
  },
};

/** Filled in by the registration test, consumed by the recovery one. */
let recoveryCodes: string[] = [];
const PASSWORD = "a long enough password";

afterAll(() => {
  file.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("the D1 driver", () => {
  // In here, not at module load: bun evaluates every test file's body before
  // running any test, so a binding installed at load time is overwritten by
  // whichever file loaded last.
  beforeAll(() => {
    (globalThis as { __env__?: unknown }).__env__ = { DB: binding };
    resetForTests();
  });

  it("creates its tables on first use", async () => {
    expect(await isDurable()).toBe(true);
    const tables = file
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(["playlists", "sessions", "users"]);
  });

  it("registers a user, storing a hash rather than the password", async () => {
    const result = await register("ali", PASSWORD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    recoveryCodes = result.recoveryCodes;

    const row = file
      .prepare("SELECT password_hash, salt, recovery_hashes FROM users WHERE username = 'ali'")
      .get() as { password_hash: string; salt: string; recovery_hashes: string };
    expect(row.password_hash).not.toContain(PASSWORD);
    expect(row.salt.length).toBeGreaterThan(0);
    expect(JSON.parse(row.recovery_hashes)).toHaveLength(10);
  });

  it("reports a taken name instead of throwing", async () => {
    // The duplicate is a D1-shaped constraint error; the driver has to
    // recognise it as "taken" rather than let it reach the user as a crash.
    expect((await register("ali", "another long password")).ok).toBe(false);
  });

  it("logs in, and resolves the session back to the name", async () => {
    const result = await login("ali", PASSWORD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await currentUser(result.token)).toBe("ali");
  });

  it("rejects a wrong password", async () => {
    expect((await login("ali", "the wrong password")).ok).toBe(false);
  });

  it("round-trips a playlist and scopes deletion to its owner", async () => {
    const playlist: StoredPlaylist = {
      id: "abc123",
      owner: "ali",
      name: "تهران",
      isPublic: false,
      createdAt: 1,
      updatedAt: 2,
      tracks: [
        {
          id: "1",
          name: "Baraye Azadi",
          artist: ["Shervin"],
          album: "",
          pic_id: "",
          url_id: "1",
          lyric_id: "1",
          source: "netease",
        },
      ],
    };
    await insertPlaylist(playlist);

    const read = await findPlaylist("abc123");
    expect(read?.name).toBe("تهران");
    expect(read?.isPublic).toBe(false);
    expect(read?.tracks[0]?.name).toBe("Baraye Azadi");
    expect(await listPlaylistsByOwner("ali")).toHaveLength(1);
    expect(await listPlaylistsByOwner("someone-else")).toHaveLength(0);

    expect(await deletePlaylist("abc123", "someone-else")).toBe(false);
    expect(await deletePlaylist("abc123", "ali")).toBe(true);
    expect(await findPlaylist("abc123")).toBeNull();
  });

  it("revokes open sessions when the password is recovered", async () => {
    const session = await login("ali", PASSWORD);
    expect(session.ok).toBe(true);
    if (!session.ok) return;

    expect((await recover("ali", "WRONG-CODE", "a whole new password")).ok).toBe(false);
    expect((await recover("ali", recoveryCodes[0], "a whole new password")).ok).toBe(true);

    expect(await currentUser(session.token)).toBeNull();
    expect((await login("ali", PASSWORD)).ok).toBe(false);
    expect((await login("ali", "a whole new password")).ok).toBe(true);
    // Codes are single use, so the same one cannot reset the account again.
    expect((await recover("ali", recoveryCodes[0], "yet another password")).ok).toBe(false);
  });
});
