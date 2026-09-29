import type { D1Database } from "./d1";
import type { Query } from "./driver";

import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The account and shared-playlist database.
 *
 * It is SQLite in both places, which keeps a single copy of the schema and a
 * single copy of every query:
 *
 *   - On the deployed Cloudflare worker, a D1 binding. There is no writable
 *     disk there, so a file would be thrown away on the next cold start.
 *   - In development and the preview, a file at `.data/muis.sqlite`.
 *
 * `open()` picks whichever is present. Nothing is configured by hand for the
 * second one, and the first only needs a `d1_databases` entry in
 * `wrangler.jsonc`; without that binding the worker reports accounts as
 * unavailable instead of failing, which is the same refusal the file-only build
 * used to give.
 *
 * Every statement uses bound parameters. No caller-supplied value is ever
 * interpolated into SQL text, including usernames and playlist ids.
 */

/**
 * The D1 binding, if this is a worker that has one.
 *
 * Nitro's Cloudflare entry point assigns the bindings object here before any
 * request is handled, which is what makes the database reachable from a module
 * that has no request context of its own.
 */
function d1Binding(): D1Database | undefined {
  return (globalThis as { __env__?: Record<string, unknown> }).__env__?.DB as
    | D1Database
    | undefined;
}

/**
 * Opens the database, once.
 *
 * Both backends are reached through a dynamic `import()`. The file driver uses
 * `node:fs` and `node:sqlite`, which Workers does not have, so loading it
 * eagerly would fail the whole account route there instead of letting D1 serve
 * it. The dynamic form also keeps both drivers out of the browser graph — the
 * same reason `src/lib/shared-playlist.ts` reaches for this file dynamically.
 *
 * The promise is memoised, including a rejected one: if neither backend can be
 * opened, every later call should fail the same way rather than retrying on
 * every request.
 */
let handle: Promise<Query> | null = null;

function open(): Promise<Query> {
  handle ??= (async () => {
    const binding = d1Binding();
    const db = binding
      ? (await import("./d1")).openDatabase(binding)
      : (await import("./sqlite")).openDatabase();
    await db.migrate();
    return db;
  })();
  return handle;
}

/**
 * Whether accounts can work here.
 *
 * The probe is a real query rather than a look at the environment, because on a
 * worker with no binding it is the open that fails, not the configuration. The
 * answer is cached: it cannot change without a restart, and every render asks.
 */
let healthy: Promise<boolean> | null = null;

export function isDurable(): Promise<boolean> {
  healthy ??= open().then(
    () => true,
    () => false,
  );
  return healthy;
}

/* -------------------------------------------------------------------- users */

type Row = Record<string, unknown>;

const USER_COLUMNS = "username, password_hash, salt, recovery_hashes, created_at";
const PLAYLIST_COLUMNS = "id, owner, name, is_public, created_at, updated_at, tracks";

/**
 * Whether an insert failed because the name was taken.
 *
 * The message text differs between the two backends — the file driver raises
 * SQLite's own error, D1 prefixes it with `D1_ERROR` and appends the code — so
 * both spellings are matched. Nothing else is swallowed: reporting a real fault
 * as "name taken" would send the person round in circles.
 */
function isDuplicateName(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("UNIQUE constraint failed") || message.includes("SQLITE_CONSTRAINT");
}

function rowToUser(row: Row): UserRecord {
  return {
    username: String(row.username),
    passwordHash: String(row.password_hash),
    salt: String(row.salt),
    recoveryHashes: JSON.parse(String(row.recovery_hashes)) as string[],
    createdAt: Number(row.created_at),
  };
}

export async function findUser(username: string): Promise<UserRecord | null> {
  const row = await (
    await open()
  ).one<Row>(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`, username);
  return row ? rowToUser(row) : null;
}

/**
 * False when the name is already taken.
 *
 * The insert is attempted and the constraint violation is caught, rather than
 * checking for the name first and then inserting. A check-then-insert leaves a
 * window in which two simultaneous signups for the same name both pass it, and
 * one of them is then told the name was taken after the fact.
 */
export async function createUser(user: UserRecord): Promise<boolean> {
  try {
    await (
      await open()
    ).run(
      `INSERT INTO users (${USER_COLUMNS}) VALUES (?, ?, ?, ?, ?)`,
      user.username,
      user.passwordHash,
      user.salt,
      JSON.stringify(user.recoveryHashes),
      user.createdAt,
    );
    return true;
  } catch (err) {
    if (isDuplicateName(err)) return false;
    throw err;
  }
}

export async function updateUser(
  username: string,
  patch: { passwordHash: string; salt: string; recoveryHashes: string[] },
): Promise<void> {
  await (
    await open()
  ).run(
    "UPDATE users SET password_hash = ?, salt = ?, recovery_hashes = ? WHERE username = ?",
    patch.passwordHash,
    patch.salt,
    JSON.stringify(patch.recoveryHashes),
    username,
  );
}

/* ----------------------------------------------------------------- sessions */

export async function getSession(sid: string): Promise<{ username: string; at: number } | null> {
  const row = await (
    await open()
  ).one<Row>("SELECT username, created_at FROM sessions WHERE sid = ?", sid);
  return row ? { username: String(row.username), at: Number(row.created_at) } : null;
}

export async function putSession(sid: string, username: string, at: number): Promise<void> {
  await (
    await open()
  ).run(
    `INSERT INTO sessions (sid, username, created_at) VALUES (?, ?, ?)
     ON CONFLICT (sid) DO UPDATE SET username = excluded.username,
                                   created_at = excluded.created_at`,
    sid,
    username,
    at,
  );
}

export async function deleteSession(sid: string): Promise<void> {
  await (await open()).run("DELETE FROM sessions WHERE sid = ?", sid);
}

export async function deleteSessionsFor(username: string): Promise<void> {
  await (await open()).run("DELETE FROM sessions WHERE username = ?", username);
}

/* ---------------------------------------------------------------- playlists */

function rowToPlaylist(row: Row): StoredPlaylist {
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
  const row = await (
    await open()
  ).one<Row>(`SELECT ${PLAYLIST_COLUMNS} FROM playlists WHERE id = ?`, id);
  return row ? rowToPlaylist(row) : null;
}

export async function listPlaylistsByOwner(owner: string): Promise<StoredPlaylist[]> {
  const rows = await (
    await open()
  ).many<Row>(
    `SELECT ${PLAYLIST_COLUMNS} FROM playlists WHERE owner = ? ORDER BY updated_at DESC`,
    owner,
  );
  return rows.map(rowToPlaylist);
}

export async function insertPlaylist(p: StoredPlaylist): Promise<void> {
  await (
    await open()
  ).run(
    `INSERT INTO playlists (${PLAYLIST_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    p.id,
    p.owner,
    p.name,
    p.isPublic ? 1 : 0,
    p.createdAt,
    p.updatedAt,
    JSON.stringify(p.tracks),
  );
}

export async function updatePlaylist(p: StoredPlaylist): Promise<void> {
  await (
    await open()
  ).run(
    "UPDATE playlists SET name = ?, is_public = ?, updated_at = ?, tracks = ? WHERE id = ?",
    p.name,
    p.isPublic ? 1 : 0,
    p.updatedAt,
    JSON.stringify(p.tracks),
    p.id,
  );
}

export async function deletePlaylist(id: string, owner: string): Promise<boolean> {
  const changes = await (
    await open()
  ).run("DELETE FROM playlists WHERE id = ? AND owner = ?", id, owner);
  return changes > 0;
}
