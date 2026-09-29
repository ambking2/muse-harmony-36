/// <reference types="bun" />

import { beforeAll, describe, expect, it } from "bun:test";

import { login, register } from "./auth";
import { findUser, resetForTests } from "./db";
import { hashPassword, newSalt, pbkdf2, pbkdf2Iterations, verifyPassword } from "./crypto";

/**
 * The stored password hash.
 *
 * The work factor is written into the hash rather than assumed by whoever reads
 * it back. That is what lets the count be tuned per host without stranding
 * anyone: a hash written at the low end still verifies on a machine that can
 * afford more, and is brought up to the stronger count on the next sign-in.
 */

const PASSWORD = "a long enough password";

describe("password hashes", () => {
  beforeAll(() => {
    (globalThis as { __env__?: unknown }).__env__ = {};
    resetForTests();
  });

  it("stays within what this host can afford", async () => {
    const iterations = await pbkdf2Iterations();
    expect(iterations).toBeGreaterThanOrEqual(30_000);
    expect(iterations).toBeLessThanOrEqual(210_000);
  });

  it("records the work factor inside the hash", async () => {
    const salt = newSalt();
    const stored = await hashPassword(PASSWORD, salt);
    const parts = stored.split("$");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("pbkdf2");
    expect(Number(parts[1])).toBe(await pbkdf2Iterations());
    expect(stored).not.toContain(PASSWORD);
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const salt = newSalt();
    const stored = await hashPassword(PASSWORD, salt);
    expect((await verifyPassword(PASSWORD, salt, stored)).ok).toBe(true);
    expect((await verifyPassword("not the password", salt, stored)).ok).toBe(false);
  });

  it("still reads a hash written before the format carried a count", async () => {
    // A bare base64 hash from an earlier build. It has to keep working, or every
    // existing account would be locked out by a change made to the hasher.
    const salt = newSalt();
    const bare = (await hashPassword(PASSWORD, salt)).split("$")[2]!;
    expect((await verifyPassword(PASSWORD, salt, bare)).ok).toBe(true);
    expect((await verifyPassword("not the password", salt, bare)).ok).toBe(false);
  });

  it("brings an under-strength hash up on the next sign-in", async () => {
    const name = `up${Date.now().toString(36)}`;
    const created = await register(name, PASSWORD);
    expect(created.ok).toBe(true);

    const before = await findUser(name);
    // Genuinely hashed at the low count, not a good hash wearing a bad label.
    const downgraded = `pbkdf2$30000$${await pbkdf2(PASSWORD, before!.salt, 30000)}`;
    await resetUser(name, downgraded);

    expect((await login(name, PASSWORD)).ok).toBe(true);
    // Signing in is the moment it is safe to re-hash, since the password was
    // just proven correct.
    const after = await findUser(name);
    expect(after?.passwordHash).not.toBe(downgraded);
    expect(after?.passwordHash).toContain(`pbkdf2$${await pbkdf2Iterations()}$`);
    expect((await login(name, PASSWORD)).ok).toBe(true);
  });
});

/** Rewrites a stored hash, so a test can hand the account an old format. */
async function resetUser(username: string, passwordHash: string): Promise<void> {
  const { updateUser } = await import("./db");
  const user = await findUser(username);
  await updateUser(username, {
    passwordHash,
    salt: user!.salt,
    recoveryHashes: user!.recoveryHashes,
  });
}
