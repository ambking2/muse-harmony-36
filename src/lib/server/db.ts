import type { DatabaseSync } from "node:sqlite";

import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The account and shared-playlist database: a SQLite file on disk.
 *
 * Chosen because it needs no account, no service and no setup — the whole point
 * is that it just runs. `node:sqlite` ships inside Node and Bun, so there is no
 * driver to install, no HTTP round trip per query, and no key to lose.
 *
 * The cost, stated plainly: this is a file, and the deploy target is Cloudflare
 * Workers, whose filesystem is read-only. There it cannot be opened at all, and
 * `isDurable()` reports false rather than accepting a registration that would
 * silently disappear on the next cold start. Local development and the preview
 * work normally. Moving to an edge database later means replacing the body of
 * these functions and nothing else, because each one is already exactly one
 * statement.
 *
 * Every statement uses bound parameters. No caller-supplied value is ever
 * interpolated into SQL text, including usernames and playlist ids.
 */

/**
 * Opens the file, once.
 *
 * Reached through a dynamic `import()` rather than imported at the top of this
 * file, for two reasons. The driver module uses `node:fs` and `node:sqlite`,
 * which do not exist on Workers; loading it lazily means the account routes
 * still answer there, reporting that accounts are unavailable, instead of the
 * module failing to load at all. And the dynamic form keeps the driver out of
 * the browser graph — the same reason `src/lib/shared-playlist.ts` reaches for
 * this file dynamically.
 *
 * The promise is memoised, including a rejected one: if the file cannot be
 * opened, every later call should fail the same way instead of retrying a
 * directory creation on every request.
 */
let handle: Promise<DatabaseSync> | null = null;

function open(): Promise<DatabaseSync> {
  handle ??= import("./sqlite").then((m) => m.openDatabase());
  return handle;
}

/**
 * Whether accounts can work here.
 *
 * The probe is a real open rather than a look at the environment, because on
 * Workers it is the open that fails, not the configuration. The answer is
 * cached: it cannot change without a restart, and every render asks.
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
  const row = (await open())
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`)
    .get(username) as Row | undefined;
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
    (await open())
      .prepare(`INSERT INTO users (${USER_COLUMNS}) VALUES (?, ?, ?, ?, ?)`)
      .run(
        user.username,
        user.passwordHash,
        user.salt,
        JSON.stringify(user.recoveryHashes),
        user.createdAt,
      );
    return true;
  } catch (err) {
    // Only the primary key is swallowed. Any other failure is a real fault and
    // must surface rather than be reported to the user as "name taken".
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed: users.username")) {
      return false;
    }
    throw err;
  }
}

export async function updateUser(
  username: string,
  patch: { passwordHash: string; salt: string; recoveryHashes: string[] },
): Promise<void> {
  (await open())
    .prepare(`UPDATE users SET password_hash = ?, salt = ?, recovery_hashes = ? WHERE username = ?`)
    .run(patch.passwordHash, patch.salt, JSON.stringify(patch.recoveryHashes), username);
}

/* ----------------------------------------------------------------- sessions */

export async function getSession(sid: string): Promise<{ username: string; at: number } | null> {
  const row = (await open())
    .prepare("SELECT username, created_at FROM sessions WHERE sid = ?")
    .get(sid) as Row | undefined;
  return row ? { username: String(row.username), at: Number(row.created_at) } : null;
}

export async function putSession(sid: string, username: string, at: number): Promise<void> {
  (await open())
    .prepare(
      `INSERT INTO sessions (sid, username, created_at) VALUES (?, ?, ?)
       ON CONFLICT (sid) DO UPDATE SET username = excluded.username,
                                     created_at = excluded.created_at`,
    )
    .run(sid, username, at);
}

export async function deleteSession(sid: string): Promise<void> {
  (await open()).prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
}

export async function deleteSessionsFor(username: string): Promise<void> {
  (await open()).prepare("DELETE FROM sessions WHERE username = ?").run(username);
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
  const row = (await open())
    .prepare(`SELECT ${PLAYLIST_COLUMNS} FROM playlists WHERE id = ?`)
    .get(id) as Row | undefined;
  return row ? rowToPlaylist(row) : null;
}

export async function listPlaylistsByOwner(owner: string): Promise<StoredPlaylist[]> {
  const rows = (await open())
    .prepare(`SELECT ${PLAYLIST_COLUMNS} FROM playlists WHERE owner = ? ORDER BY updated_at DESC`)
    .all(owner) as Row[];
  return rows.map(rowToPlaylist);
}

export async function insertPlaylist(p: StoredPlaylist): Promise<void> {
  (await open())
    .prepare(`INSERT INTO playlists (${PLAYLIST_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(
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
  (await open())
    .prepare(
      "UPDATE playlists SET name = ?, is_public = ?, updated_at = ?, tracks = ? WHERE id = ?",
    )
    .run(p.name, p.isPublic ? 1 : 0, p.updatedAt, JSON.stringify(p.tracks), p.id);
}

export async function deletePlaylist(id: string, owner: string): Promise<boolean> {
  const result = (await open())
    .prepare("DELETE FROM playlists WHERE id = ? AND owner = ?")
    .run(id, owner);
  return Number(result.changes) > 0;
}
