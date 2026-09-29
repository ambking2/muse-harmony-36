/// <reference types="bun" />

import { beforeEach, describe, expect, it } from "bun:test";

import { documentStore, type DocumentBackend } from "./document";
import type { UserRecord } from "./types";

/**
 * Two stores, one database.
 *
 * A Cloudflare Worker is not one process but many, and each of them loads this
 * module separately. A store that kept the document it had read would answer
 * from that copy: it would not see a session opened on another isolate, and
 * when it wrote, it would save a document that was missing everything the
 * others had stored. That is not hypothetical — it is what production did until
 * the cache between operations was removed, and it showed up as a login that
 * worked and then 401'd on the next request.
 *
 * These two tests are the ones that would have caught it, and neither of them
 * can fail against a single process, which is exactly why they were missing.
 */

let row: string | null = null;

/** One row of JSON, the way D1, KV and a file all end up storing it. */
const shared: DocumentBackend = {
  read: async () => (row ? (JSON.parse(row) as never) : null),
  write: async (snapshot) => {
    row = JSON.stringify(snapshot);
  },
};

function user(username: string): UserRecord {
  return {
    username,
    passwordHash: "hash",
    salt: "salt",
    createdAt: 1,
    recoveryHashes: [],
  };
}

describe("two stores over one database", () => {
  beforeEach(() => {
    row = null;
  });

  it("lets the second one see what the first stored", async () => {
    const first = documentStore(shared);
    const second = documentStore(shared);

    await first.createUser(user("ali"));
    // Read from a store that has never seen the write. With the cache this
    // was null, and a signed-in user was told to log in again.
    expect(await second.findUser("ali")).not.toBeNull();

    await first.createUser(user("sara"));
    expect(await second.findUser("sara")).not.toBeNull();
  });

  it("does not save over what the other one just wrote", async () => {
    const first = documentStore(shared);
    const second = documentStore(shared);

    // `second` looks before `first` writes, so it is holding a document with
    // nobody in it — the stale copy that deleted accounts in production.
    await second.findUser("nobody");
    await first.createUser(user("sara"));
    await second.createUser(user("nima"));

    expect(await first.findUser("nima")).not.toBeNull();
    expect(await first.findUser("sara")).not.toBeNull();
  });

  it("still sees a session opened on the other side", async () => {
    const first = documentStore(shared);
    const second = documentStore(shared);

    await first.putSession("sid-1", "ali", Date.now());
    // The 401 case: a valid session that the reading isolate had never heard of.
    expect(await second.getSession("sid-1")).not.toBeNull();
  });
});
