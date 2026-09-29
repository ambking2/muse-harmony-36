import type { Client, InValue } from "@libsql/client";

import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The account and shared-playlist database, on Turso over libSQL.
 *
 * This replaces an earlier file-backed store. A file cannot survive a Workers
 * deploy — the filesystem there is read-only — so accounts silently vanished on
 * the next cold start. Turso is reachable over plain HTTP, which means the same
 * code and the same data serve both local development and the deployed worker,
 * and there is no second code path to keep honest.
 *
 * Every statement uses bound parameters. Nothing in this file interpolates a
 * caller-supplied value into SQL, including usernames and playlist ids.
 */

const URL = process.env.TURSO_DATABASE_URL;
const TOKEN = process.env.TURSO_AUTH_TOKEN;

let clientPromise: Promise<Client> | null = null;
let ready: Promise<void> | null = null;

export function isConfigured(): boolean {
  return !!URL;
}

/**
 * The client, loaded with a dynamic `import()` rather than `require`.
 *
 * The server bundle is ES modules, where `require` does not exist — calling it
 * would only fail on Workers, i.e. exactly where this is needed. The dynamic
 * form also keeps the database driver out of the browser graph.
 */
function db(): Promise<Client> {
  if (!URL) return Promise.reject(new Error("TURSO_DATABASE_URL is not set"));
  clientPromise ??= import("@libsql/client").then((m) =>
    m.createClient({ url: URL, authToken: TOKEN }),
  );
  return clientPromise;
}

async function exec(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}

/**
 * Creates the tables on first use.
 *
 * Every statement is `IF NOT EXISTS`, so this is safe to run on every cold start
 * and several isolates racing each other. It is cached per isolate because it
 * runs on the first request that touches the database, and a deploy can spin up
 * many at once.
 */
function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    await (
      await db()
    ).batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
           username     TEXT PRIMARY KEY,
           password_hash TEXT NOT NULL,
           salt         TEXT NOT NULL,
           recovery_hashes TEXT NOT NULL,
           created_at   INTEGER NOT NULL
         )`,
        `CREATE TABLE IF NOT EXISTS sessions (
           sid       TEXT PRIMARY KEY,
           username  TEXT NOT NULL,
           created_at INTEGER NOT NULL
         )`,
        `CREATE INDEX IF NOT EXISTS sessions_username ON sessions (username)`,
        `CREATE TABLE IF NOT EXISTS playlists (
           id         TEXT PRIMARY KEY,
           owner      TEXT NOT NULL,
           name       TEXT NOT NULL,
           is_public  INTEGER NOT NULL DEFAULT 0,
           created_at INTEGER NOT NULL,
           updated_at INTEGER NOT NULL,
           tracks     TEXT NOT NULL
         )`,
        `CREATE INDEX IF NOT EXISTS playlists_owner ON playlists (owner)`,
      ],
      "write",
    );
  })().catch((err) => {
    // A failed first attempt must not poison every later request in this isolate.
    ready = null;
    throw err;
  });
  return ready;
}

/**
 * Whether accounts can work here.
 *
 * Configuration alone is not enough — the token could be wrong or the database
 * gone. A cheap round trip answers the question the UI actually cares about, and
 * the result is cached so a working database costs one query per isolate.
 */
let healthy: Promise<boolean> | null = null;

export function isDurable(): Promise<boolean> {
  healthy ??= (async () => {
    if (!URL) return false;
    try {
      await ensureSchema();
      await exec("SELECT 1");
      return true;
    } catch {
      return false;
    }
  })();
  return healthy;
}

/** Test seam, and a way to recover after a transient outage. */
export function resetHealthCache() {
  healthy = null;
  ready = null;
}

/* -------------------------------------------------------------------- users */

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    username: String(row.username),
    passwordHash: String(row.password_hash),
    salt: String(row.salt),
    recoveryHashes: JSON.parse(String(row.recovery_hashes)) as string[],
    createdAt: Number(row.created_at),
  };
}

export async function findUser(username: string): Promise<UserRecord | null> {
  await ensureSchema();
  const res = await exec(
    `SELECT username, password_hash, salt, recovery_hashes, created_at
     FROM users WHERE username = ?`,
    [username],
  );
  const row = res.rows[0];
  return row ? rowToUser(row) : null;
}

/**
 * False when the name is already taken.
 *
 * The primary key is the real guarantee; the insert is attempted and the
 * constraint violation is caught. Checking first would leave a window in which
 * two simultaneous signups for the same name both pass.
 */
export async function createUser(user: UserRecord): Promise<boolean> {
  await ensureSchema();
  try {
    await exec(
      `INSERT INTO users (username, password_hash, salt, recovery_hashes, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        user.username,
        user.passwordHash,
        user.salt,
        JSON.stringify(user.recoveryHashes),
        user.createdAt,
      ],
    );
    return true;
  } catch (err) {
    // libSQL surfaces a unique-constraint failure with this marker.
    if (String(err).includes("UNIQUE") || String(err).includes("constraint")) return false;
    throw err;
  }
}

export async function updateUser(
  username: string,
  patch: { passwordHash: string; salt: string; recoveryHashes: string[] },
): Promise<void> {
  await ensureSchema();
  await exec(
    `UPDATE users SET password_hash = ?, salt = ?, recovery_hashes = ? WHERE username = ?`,
    [patch.passwordHash, patch.salt, JSON.stringify(patch.recoveryHashes), username],
  );
}

/* ----------------------------------------------------------------- sessions */

export async function getSession(sid: string): Promise<{ username: string; at: number } | null> {
  await ensureSchema();
  const res = await exec("SELECT username, created_at FROM sessions WHERE sid = ?", [sid]);
  const row = res.rows[0];
  return row ? { username: String(row.username), at: Number(row.created_at) } : null;
}

export async function putSession(sid: string, username: string, at: number): Promise<void> {
  await ensureSchema();
  await exec(
    `INSERT INTO sessions (sid, username, created_at) VALUES (?, ?, ?)
     ON CONFLICT (sid) DO UPDATE SET username = excluded.username, created_at = excluded.created_at`,
    [sid, username, at],
  );
}

export async function deleteSession(sid: string): Promise<void> {
  await ensureSchema();
  await exec("DELETE FROM sessions WHERE sid = ?", [sid]);
}

export async function deleteSessionsFor(username: string): Promise<void> {
  await ensureSchema();
  await exec("DELETE FROM sessions WHERE username = ?", [username]);
}

/* ---------------------------------------------------------------- playlists */

function rowToPlaylist(row: Record<string, unknown>): StoredPlaylist {
  return {
    id: String(row.id),
    owner: String(row.owner),
    name: String(row.name),
    isPublic: Number(row.is_public) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    tracks: JSON.parse(String(row.tracks)) as StoredPlaylist["tracks"],
  };
}

export async function findPlaylist(id: string): Promise<StoredPlaylist | null> {
  await ensureSchema();
  const res = await exec(
    `SELECT id, owner, name, is_public, created_at, updated_at, tracks
     FROM playlists WHERE id = ?`,
    [id],
  );
  const row = res.rows[0];
  return row ? rowToPlaylist(row) : null;
}

export async function listPlaylistsByOwner(owner: string): Promise<StoredPlaylist[]> {
  await ensureSchema();
  const res = await exec(
    `SELECT id, owner, name, is_public, created_at, updated_at, tracks
     FROM playlists WHERE owner = ? ORDER BY updated_at DESC`,
    [owner],
  );
  return res.rows.map(rowToPlaylist);
}

export async function insertPlaylist(p: StoredPlaylist): Promise<void> {
  await ensureSchema();
  await exec(
    `INSERT INTO playlists (id, owner, name, is_public, created_at, updated_at, tracks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [p.id, p.owner, p.name, p.isPublic ? 1 : 0, p.createdAt, p.updatedAt, JSON.stringify(p.tracks)],
  );
}

export async function updatePlaylist(p: StoredPlaylist): Promise<void> {
  await ensureSchema();
  await exec(
    `UPDATE playlists SET name = ?, is_public = ?, updated_at = ?, tracks = ? WHERE id = ?`,
    [p.name, p.isPublic ? 1 : 0, p.updatedAt, JSON.stringify(p.tracks), p.id],
  );
}

export async function deletePlaylist(id: string, owner: string): Promise<boolean> {
  await ensureSchema();
  const res = await exec("DELETE FROM playlists WHERE id = ? AND owner = ?", [id, owner]);
  return res.rowsAffected > 0;
}

export type { InValue };
