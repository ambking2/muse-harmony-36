import type { Store } from "./store";
import type { LibraryDocument } from "../types";
import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The account database, as one JSON object.
 *
 * This is the whole of it: four maps, no schema, no tables, no migrations.
 * A user, a session, a shared playlist and the library that follows an account
 * from device to device are plain values in plain maps, the same shape you
 * would get from `JSON.parse` of a file.
 *
 * Where the object is *kept* is a separate question with a separate answer, and
 * that is all a backend supplies: something that reads the object and something
 * that writes it. A file on disk, a D1 row, a KV value, or plain memory all
 * serve the same code, which is why none of them can drift apart.
 */
export interface Snapshot {
  users: Record<string, UserRecord>;
  sessions: Record<string, { username: string; at: number }>;
  playlists: Record<string, StoredPlaylist>;
  /** Per account: playlists, favourites, history. See `LibraryDocument`. */
  libraries: Record<string, LibraryDocument>;
}

export const EMPTY: Snapshot = { users: {}, sessions: {}, playlists: {}, libraries: {} };

/** How long a session stays valid. Long by design: this is a music player. */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export interface DocumentBackend {
  /** The stored object, or null when there is nothing stored yet. */
  read(): Promise<Snapshot | null>;
  write(snapshot: Snapshot): Promise<void>;
  /** Frees the resources the read/write pair holds, if any. */
  close?(): void;
}

export function documentStore(backend: DocumentBackend): Store {
  /**
   * Every operation starts by reading the document, and nothing is cached
   * between them.
   *
   * That sounds wasteful until the host is a Cloudflare Worker, which is not one
   * process but many. Each isolate gets its own copy of this module and its own
   * memory, and an isolate that remembered the document would answer from that
   * memory: it would not see a session opened on another isolate and would
   * sign a perfectly good user out, and when it next wrote, it would save its
   * stale copy and quietly delete whatever the other isolate had just stored.
   * Both happened in production before this was removed — a login that worked,
   * then 401 on the very next request.
   *
   * So the cost is one read per operation, which on a single-row document is a
   * fast, indexed lookup, and in exchange every isolate tells the truth. What
   * is left is that two genuinely simultaneous writes can still race, since
   * both read before either writes; that is the honest limit of keeping the
   * whole database in one value, and the reason to stop doing that is to stop
   * doing that.
   */
  const load = async (): Promise<Snapshot> => {
    const stored = await backend.read();
    return {
      users: stored?.users ?? {},
      sessions: stored?.sessions ?? {},
      playlists: stored?.playlists ?? {},
      // A database written before accounts carried a library has none, which
      // is not a problem: the first sign-in sends one.
      libraries: stored?.libraries ?? {},
    };
  };

  const save = async (next: Snapshot): Promise<void> => {
    const now = Date.now();
    for (const [sid, session] of Object.entries(next.sessions)) {
      if (now - session.at > SESSION_TTL_MS) delete next.sessions[sid];
    }
    await backend.write(next);
  };

  return {
    async findUser(username) {
      return (await load()).users[username] ?? null;
    },

    async createUser(user) {
      const db = await load();
      if (db.users[user.username]) return false;
      await save({ ...db, users: { ...db.users, [user.username]: user } });
      return true;
    },

    async updateUser(username, patch) {
      const db = await load();
      const existing = db.users[username];
      if (!existing) return;
      await save({ ...db, users: { ...db.users, [username]: { ...existing, ...patch } } });
    },

    async getSession(sid) {
      return (await load()).sessions[sid] ?? null;
    },

    async putSession(sid, username, at) {
      const db = await load();
      await save({ ...db, sessions: { ...db.sessions, [sid]: { username, at } } });
    },

    async deleteSession(sid) {
      const db = await load();
      if (!db.sessions[sid]) return;
      const sessions = { ...db.sessions };
      delete sessions[sid];
      await save({ ...db, sessions });
    },

    async deleteSessionsFor(username) {
      // Every session opened with a password that is about to change goes first,
      // so there is no moment where the new password and an old session are
      // both live.
      const db = await load();
      const sessions: Snapshot["sessions"] = {};
      for (const [sid, session] of Object.entries(db.sessions)) {
        if (session.username !== username) sessions[sid] = session;
      }
      await save({ ...db, sessions });
    },

    async getLibrary(username) {
      return (await load()).libraries[username] ?? null;
    },

    async saveLibrary(username, document) {
      const db = await load();
      await save({ ...db, libraries: { ...db.libraries, [username]: document } });
    },

    async findPlaylist(id) {
      return (await load()).playlists[id] ?? null;
    },

    async listPlaylistsByOwner(owner) {
      return Object.values((await load()).playlists)
        .filter((p) => p.owner === owner)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async insertPlaylist(playlist) {
      const db = await load();
      await save({ ...db, playlists: { ...db.playlists, [playlist.id]: playlist } });
    },

    async updatePlaylist(playlist) {
      const db = await load();
      if (!db.playlists[playlist.id]) return;
      await save({ ...db, playlists: { ...db.playlists, [playlist.id]: playlist } });
    },

    async deletePlaylist(id, owner) {
      const db = await load();
      const existing = db.playlists[id];
      if (!existing || existing.owner !== owner) return false;
      const playlists = { ...db.playlists };
      delete playlists[id];
      await save({ ...db, playlists });
      return true;
    },

    async migrate() {
      // There is nothing to migrate. No tables, no schema version, no upgrade
      // step — the document makes itself on first write.
      await load();
    },
  };
}
