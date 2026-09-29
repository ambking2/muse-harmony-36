import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { DatabaseSync } from "node:sqlite";

import type { Query, SqlValue } from "./driver";
import { SCHEMA } from "./driver";
import type { Store } from "./store";
import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The database as a SQLite file on disk: used in development and the preview.
 *
 * This is the only module that touches `node:fs` and `node:sqlite`, and the
 * account store reaches it through a dynamic `import()`. That indirection is
 * what lets the account routes keep loading on Cloudflare Workers, where those
 * two builtins do not exist at all — a static import would fail the whole route
 * at module-resolution time instead of letting a binding serve it.
 *
 * The file lives at `.data/muis.sqlite`, resolved from the working directory.
 * The dev server, the preview and the built server are all started from the
 * project root, and that is also the one place the data is a file the user can
 * find, back up or delete by hand.
 */
const DATA_DIR = join(process.cwd(), ".data");

function openQuery(): Query {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(join(DATA_DIR, "muis.sqlite"));
  // WAL means a crash mid-write rolls back to the last complete transaction
  // rather than leaving a half-written page, and FULL synchronous means a write
  // has actually reached the disk before the request that made it reports
  // success. Busy reads wait instead of failing, since several requests can
  // arrive together.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = FULL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA foreign_keys = ON");

  return {
    async one<T>(sql: string, ...args: SqlValue[]): Promise<T | null> {
      return (db.prepare(sql).get(...args) as T | undefined) ?? null;
    },
    async many<T>(sql: string, ...args: SqlValue[]): Promise<T[]> {
      return db.prepare(sql).all(...args) as T[];
    },
    async run(sql: string, ...args: SqlValue[]): Promise<number> {
      return Number(db.prepare(sql).run(...args).changes);
    },
    async migrate(): Promise<void> {
      db.exec(SCHEMA.join(";\n"));
    },
  };
}

type Row = Record<string, unknown>;

const USER_COLUMNS = "username, password_hash, salt, recovery_hashes, created_at";
const PLAYLIST_COLUMNS = "id, owner, name, is_public, created_at, updated_at, tracks";

/**
 * Whether an insert failed because the name was taken.
 *
 * The message text differs between the two SQL backends — the file driver
 * raises SQLite's own error, D1 prefixes it with `D1_ERROR` and appends the
 * code — so both spellings are matched. Nothing else is swallowed: reporting a
 * real fault as "name taken" would send the person round in circles.
 */
function isDuplicateName(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("UNIQUE constraint failed") || message.includes("SQLITE_CONSTRAINT");
}

/**
 * The SQL store, over whichever SQL connection is handed in: the D1 binding on
 * a worker, or the local file when there is none.
 */
export function openStore(connection?: Query): Store {
  const open = connection ?? openQuery();
  return {
    async findUser(username) {
      const row = await open.one<Row>(
        `SELECT ${USER_COLUMNS} FROM users WHERE username = ?`,
        username,
      );
      if (!row) return null;
      return {
        username: String(row.username),
        passwordHash: String(row.password_hash),
        salt: String(row.salt),
        recoveryHashes: JSON.parse(String(row.recovery_hashes)) as string[],
        createdAt: Number(row.created_at),
      };
    },

    async createUser(user) {
      try {
        await open.run(
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
    },

    async updateUser(username, patch) {
      await open.run(
        "UPDATE users SET password_hash = ?, salt = ?, recovery_hashes = ? WHERE username = ?",
        patch.passwordHash,
        patch.salt,
        JSON.stringify(patch.recoveryHashes),
        username,
      );
    },

    async getSession(sid) {
      const row = await open.one<Row>(
        "SELECT username, created_at FROM sessions WHERE sid = ?",
        sid,
      );
      return row ? { username: String(row.username), at: Number(row.created_at) } : null;
    },

    async putSession(sid, username, at) {
      await open.run(
        `INSERT INTO sessions (sid, username, created_at) VALUES (?, ?, ?)
         ON CONFLICT (sid) DO UPDATE SET username = excluded.username,
                                       created_at = excluded.created_at`,
        sid,
        username,
        at,
      );
    },

    async deleteSession(sid) {
      await open.run("DELETE FROM sessions WHERE sid = ?", sid);
    },

    async deleteSessionsFor(username) {
      await open.run("DELETE FROM sessions WHERE username = ?", username);
    },

    async findPlaylist(id) {
      const row = await open.one<Row>(`SELECT ${PLAYLIST_COLUMNS} FROM playlists WHERE id = ?`, id);
      if (!row) return null;
      return {
        id: String(row.id),
        owner: String(row.owner),
        name: String(row.name),
        isPublic: Number(row.is_public) === 1,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        tracks: JSON.parse(String(row.tracks)) as StoredPlaylist["tracks"],
      };
    },

    async listPlaylistsByOwner(owner) {
      const rows = await open.many<Row>(
        `SELECT ${PLAYLIST_COLUMNS} FROM playlists WHERE owner = ? ORDER BY updated_at DESC`,
        owner,
      );
      return rows.map(rowToPlaylist);
    },

    async insertPlaylist(playlist) {
      await open.run(
        `INSERT INTO playlists (${PLAYLIST_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        playlist.id,
        playlist.owner,
        playlist.name,
        playlist.isPublic ? 1 : 0,
        playlist.createdAt,
        playlist.updatedAt,
        JSON.stringify(playlist.tracks),
      );
    },

    async updatePlaylist(playlist) {
      await open.run(
        "UPDATE playlists SET name = ?, is_public = ?, updated_at = ?, tracks = ? WHERE id = ?",
        playlist.name,
        playlist.isPublic ? 1 : 0,
        playlist.updatedAt,
        JSON.stringify(playlist.tracks),
        playlist.id,
      );
    },

    async deletePlaylist(id, owner) {
      const changes = await open.run("DELETE FROM playlists WHERE id = ? AND owner = ?", id, owner);
      return changes > 0;
    },

    migrate: () => open.migrate(),
  };
}

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
