import type { Store } from "./store";
import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The database as one JSON document, on Cloudflare Workers KV.
 *
 * KV is a key/value store in the same Cloudflare account as the worker: no
 * second vendor, no key to configure, no schema and no SQL. One key,
 * `muis`, holds the whole database as JSON — the accounts, the sessions and
 * the shared playlists, exactly as a file would.
 *
 * Everything is in one value rather than one key per record, which keeps it to
 * a read, a change and a write. For an app with a handful of accounts that is
 * the simplest thing that can work, and it is the same shape a local JSON file
 * would have, so the two can be reasoned about identically.
 *
 * Two properties of KV shape the code and are worth stating plainly. Writes
 * become visible everywhere within about a minute, so `recent` remembers what
 * this process wrote and a read prefers it — without that, a signup could
 * write the account and then fail to find it. And two writes in flight at once
 * are last-one-wins, so every change is a read-modify-write of the whole
 * document. That is a real limit of one document, and it is acceptable at this
 * scale and not at a larger one.
 */
export interface KVNamespace {
  get(key: string, type: "text"): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const KEY = "muis";

/** Sessions outlive their welcome; drop the stale ones on every write. */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface Snapshot {
  users: Record<string, UserRecord>;
  sessions: Record<string, { username: string; at: number }>;
  playlists: Record<string, StoredPlaylist>;
}

const EMPTY: Snapshot = { users: {}, sessions: {}, playlists: {} };

export function openStore(namespace: KVNamespace): Store {
  /** Write-through cache; see the note above. */
  let recent: Snapshot | null = null;

  const load = async (): Promise<Snapshot> => {
    if (recent) return recent;
    const text = await namespace.get(KEY, "text");
    // A missing or unreadable value is an empty database, not a failure: the
    // app creates its own state on first use and has nothing to migrate.
    const parsed = text ? (JSON.parse(text) as Partial<Snapshot>) : {};
    recent = {
      users: parsed.users ?? {},
      sessions: parsed.sessions ?? {},
      playlists: parsed.playlists ?? {},
    };
    return recent;
  };

  const save = async (next: Snapshot): Promise<void> => {
    const now = Date.now();
    for (const [sid, session] of Object.entries(next.sessions)) {
      if (now - session.at > SESSION_TTL_MS) delete next.sessions[sid];
    }
    recent = next;
    await namespace.put(KEY, JSON.stringify(next));
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
      // Nothing to create. The document makes itself on first write, which is
      // the whole point of there being no schema.
      await load();
    },
  };
}
