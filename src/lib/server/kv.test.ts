/// <reference types="bun" />

import { beforeAll, describe, expect, it } from "bun:test";

import { currentUser, login, recover, register } from "./auth";
import {
  deletePlaylist,
  findPlaylist,
  insertPlaylist,
  listPlaylistsByOwner,
  resetForTests,
  storageMode,
} from "./db";
import type { KVNamespace } from "./kv";
import type { StoredPlaylist } from "./types";

/**
 * The account flow against a KV backend, exercised without a Worker.
 *
 * A Worker has no disk, so without a double the bound path would ship with no
 * test at all. This is a key/value store with the shape of the real binding,
 * holding the same single `muis` key as one JSON document.
 */

const store = new Map<string, string>();

const namespace: KVNamespace = {
  get: async (key: string) => store.get(key) ?? null,
  put: async (key: string, value: string) => {
    store.set(key, value);
  },
};

/** Filled in by the registration test, consumed by the recovery one. */
let recoveryCodes: string[] = [];

describe("the account flow over a KV backend", () => {
  // In here, not at module load: bun evaluates every test file's body before
  // running any test, so a binding installed at load time is overwritten by
  // whichever file loaded last.
  beforeAll(() => {
    (globalThis as { __env__?: unknown }).__env__ = { MUIS: namespace };
    resetForTests();
  });

  const snapshot = () => JSON.parse(store.get("muis") ?? "{}");

  it("reports the backend it picked", async () => {
    expect(await storageMode()).toBe("kv");
    // Nothing is written until there is something to write.
    expect(store.has("muis")).toBe(false);
  });

  it("registers a user, storing a hash rather than the password", async () => {
    const result = await register("ali", "a long enough password");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    recoveryCodes = result.recoveryCodes;

    const stored = snapshot().users.ali;
    expect(stored.passwordHash).toBeString();
    expect(stored.passwordHash).not.toContain("a long enough password");
    expect(stored.recoveryHashes).toHaveLength(10);
  });

  it("lets a signup see its own account straight away", async () => {
    // Without a write-through cache this is the failure: the account is
    // written, and the read that follows has not caught up.
    const result = await login("ali", "a long enough password");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await currentUser(result.token)).toBe("ali");
  });

  it("reports a taken name", async () => {
    expect((await register("ali", "another long password")).ok).toBe(false);
  });

  it("rejects a wrong password", async () => {
    expect((await login("ali", "the wrong password")).ok).toBe(false);
  });

  it("lists a user's playlists, newest first, and nobody else's", async () => {
    const playlist = (id: string, owner: string, updatedAt: number): StoredPlaylist => ({
      id,
      owner,
      name: `playlist ${id}`,
      isPublic: false,
      createdAt: 1,
      updatedAt,
      tracks: [
        {
          id: "1",
          name: "Delbar",
          artist: ["Shadmehr"],
          album: "",
          pic_id: "",
          url_id: "1",
          lyric_id: "1",
          source: "netease",
        },
      ],
    });

    await insertPlaylist(playlist("aaa111", "ali", 10));
    await insertPlaylist(playlist("bbb222", "ali", 20));
    await insertPlaylist(playlist("ccc333", "sara", 30));

    expect((await listPlaylistsByOwner("ali")).map((p) => p.id)).toEqual(["bbb222", "aaa111"]);
    expect((await listPlaylistsByOwner("ali"))[0]?.tracks[0]?.name).toBe("Delbar");
    expect(await listPlaylistsByOwner("nobody")).toEqual([]);
  });

  it("scopes a delete to the owner", async () => {
    expect(await deletePlaylist("aaa111", "sara")).toBe(false);
    expect(await findPlaylist("aaa111")).not.toBeNull();

    expect(await deletePlaylist("aaa111", "ali")).toBe(true);
    expect(await findPlaylist("aaa111")).toBeNull();
    expect((await listPlaylistsByOwner("ali")).map((p) => p.id)).toEqual(["bbb222"]);
  });

  it("revokes every open session when the password is recovered", async () => {
    const first = await login("ali", "a long enough password");
    const second = await login("ali", "a long enough password");
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect((await recover("ali", "WRONG-CODE", "a whole new password")).ok).toBe(false);
    expect((await recover("ali", recoveryCodes[0], "a whole new password")).ok).toBe(true);

    // Both, not just the one that started it: the point of recovery is that a
    // password nobody else has stops being a way in.
    expect(Object.keys(snapshot().sessions)).toEqual([]);

    expect((await login("ali", "a long enough password")).ok).toBe(false);
    expect((await login("ali", "a whole new password")).ok).toBe(true);
  });
});
