import type { StorageMode, LibraryDocument } from "../types";
import type { D1Database } from "./d1";
import type { KVNamespace } from "./kv";
import type { Store } from "./store";

import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The account database: one JSON object, kept somewhere that lasts.
 *
 * Four places, tried in order, and the app behaves identically on all four:
 *
 *   - a D1 binding, if the host provides one — the only way an account survives
 *     a restart on a Cloudflare Worker
 *   - a KV binding, for a worker set up before D1
 *   - `.data/muis.json` on disk, which is what development and the preview get
 *   - memory, when there is nowhere to write — a Worker with no binding
 *
 * Memory is a working store, not an error. Signing up always works; what
 * changes is whether the account is still there after a restart, and
 * `storageMode()` reports which of the four is in play so the interface can say
 * so rather than leave it to be discovered.
 *
 * Every backend is reached through a dynamic `import()`. Beyond keeping server
 * code out of the browser graph, it is what lets the file backend fail softly
 * on a Worker instead of taking the whole route down with a missing `node:fs`.
 */

function binding<T>(name: string): T | undefined {
  return (globalThis as { __env__?: Record<string, unknown> }).__env__?.[name] as T | undefined;
}

/**
 * A store that keeps working when the one in front of it stops answering.
 *
 * A binding can be misconfigured in ways no amount of local testing shows: the
 * database exists but the table does not, the account has no access, the
 * region is having a bad day. Failing every signup on that would be a worse
 * answer than keeping accounts in memory and saying so — so the first failure
 * switches for good, and `storageMode()` reports `memory` from then on, which
 * is the truth: those accounts will not survive a restart.
 */
function failover(primary: Store, spare: Store, onFail: (error: unknown) => void): Store {
  let usingSpare = false;

  const attempt = async <T>(work: (store: Store) => Promise<T>): Promise<T> => {
    if (usingSpare) return work(spare);
    try {
      return await work(primary);
    } catch (error) {
      onFail(error);
      usingSpare = true;
    }
    return work(spare);
  };

  return {
    findUser: (username) => attempt((s) => s.findUser(username)),
    createUser: (user) => attempt((s) => s.createUser(user)),
    updateUser: (username, patch) => attempt((s) => s.updateUser(username, patch)),
    getSession: (sid) => attempt((s) => s.getSession(sid)),
    putSession: (sid, username, at) => attempt((s) => s.putSession(sid, username, at)),
    deleteSession: (sid) => attempt((s) => s.deleteSession(sid)),
    deleteSessionsFor: (username) => attempt((s) => s.deleteSessionsFor(username)),
    getLibrary: (username) => attempt((s) => s.getLibrary(username)),
    saveLibrary: (username, document) => attempt((s) => s.saveLibrary(username, document)),
    findPlaylist: (id) => attempt((s) => s.findPlaylist(id)),
    listPlaylistsByOwner: (owner) => attempt((s) => s.listPlaylistsByOwner(owner)),
    insertPlaylist: (playlist) => attempt((s) => s.insertPlaylist(playlist)),
    updatePlaylist: (playlist) => attempt((s) => s.updatePlaylist(playlist)),
    deletePlaylist: (id, owner) => attempt((s) => s.deletePlaylist(id, owner)),
    migrate: () => attempt((s) => s.migrate()),
  };
}

let handle: Promise<{ store: Store; mode: StorageMode; degraded?: () => boolean }> | null = null;

async function build(): Promise<{ store: Store; mode: StorageMode; degraded?: () => boolean }> {
  const d1 = binding<D1Database>("MUIS_DB");
  if (d1) {
    const [{ documentStore }, { openBackend }, { openBackend: openMemory }] = await Promise.all([
      import("./document"),
      import("./d1"),
      import("./memory"),
    ]);
    let failed = false;
    const store = failover(
      documentStore(openBackend(d1, () => (failed = true))),
      documentStore(openMemory()),
      (error) => {
        failed = true;
        console.error("muis: D1 is not answering, keeping accounts in memory until it is", error);
      },
    );
    return { store, mode: "d1", degraded: () => failed };
  }
  const kv = binding<KVNamespace>("MUIS");
  if (kv) {
    const { documentStore } = await import("./document");
    const { openBackend } = await import("./kv");
    return { store: documentStore(openBackend(kv)), mode: "kv" };
  }
  try {
    const [{ documentStore }, { openBackend }] = await Promise.all([
      import("./document"),
      import("./file"),
    ]);
    // A disk that starts refusing writes mid-life should not turn every signup
    // into a 500. The file backend keeps the document in memory when a write
    // fails, and this is what lets storageMode() report that honestly instead
    // of still claiming "file".
    let failed = false;
    const store = documentStore(openBackend(() => (failed = true)));
    return { store, mode: "file", degraded: () => failed };
  } catch {
    // No writable disk, which is exactly the Worker case. Memory from here.
    const [{ documentStore }, { openBackend }] = await Promise.all([
      import("./document"),
      import("./memory"),
    ]);
    return { store: documentStore(openBackend()), mode: "memory" };
  }
}

function open(): Promise<{ store: Store; mode: StorageMode; degraded?: () => boolean }> {
  handle ??= build();
  return handle;
}

/** Where the account data is going, so anything listening can say so. */
export async function storageMode(): Promise<StorageMode> {
  const { mode, degraded } = await open();
  return degraded?.() ? "memory" : mode;
}

/** Test seam: forget the backend so the next call picks again. */
export function resetForTests(): void {
  handle = null;
}

/* -------------------------------------------------------------------- users */

export async function findUser(username: string): Promise<UserRecord | null> {
  return (await open()).store.findUser(username);
}

/** False when the name is already taken. */
export async function createUser(user: UserRecord): Promise<boolean> {
  return (await open()).store.createUser(user);
}

export async function updateUser(
  username: string,
  patch: { passwordHash: string; salt: string; recoveryHashes: string[] },
): Promise<void> {
  return (await open()).store.updateUser(username, patch);
}

/* ------------------------------------------------------------------ library */

export async function getLibrary(username: string): Promise<LibraryDocument | null> {
  return (await open()).store.getLibrary(username);
}

export async function saveLibrary(username: string, document: LibraryDocument): Promise<void> {
  return (await open()).store.saveLibrary(username, document);
}

/* ----------------------------------------------------------------- sessions */

export async function getSession(sid: string): Promise<{ username: string; at: number } | null> {
  return (await open()).store.getSession(sid);
}

export async function putSession(sid: string, username: string, at: number): Promise<void> {
  return (await open()).store.putSession(sid, username, at);
}

export async function deleteSession(sid: string): Promise<void> {
  return (await open()).store.deleteSession(sid);
}

export async function deleteSessionsFor(username: string): Promise<void> {
  return (await open()).store.deleteSessionsFor(username);
}

/* ---------------------------------------------------------------- playlists */

export async function findPlaylist(id: string): Promise<StoredPlaylist | null> {
  return (await open()).store.findPlaylist(id);
}

export async function listPlaylistsByOwner(owner: string): Promise<StoredPlaylist[]> {
  return (await open()).store.listPlaylistsByOwner(owner);
}

export async function insertPlaylist(playlist: StoredPlaylist): Promise<void> {
  return (await open()).store.insertPlaylist(playlist);
}

export async function updatePlaylist(playlist: StoredPlaylist): Promise<void> {
  return (await open()).store.updatePlaylist(playlist);
}

export async function deletePlaylist(id: string, owner: string): Promise<boolean> {
  return (await open()).store.deletePlaylist(id, owner);
}
