import type { StorageMode } from "../types";
import type { KVNamespace } from "./kv";
import type { Store } from "./store";

import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The account database: one JSON object, kept somewhere that lasts.
 *
 * Three places, tried in order, and the app behaves identically on all three:
 *
 *   - a KV binding, if the host provides one — the only way an account survives
 *     a restart on a Cloudflare Worker
 *   - `.data/muis.json` on disk, which is what development and the preview get
 *   - memory, when there is nowhere to write — a Worker with no binding
 *
 * Memory is a working store, not an error. Signing up always works; what
 * changes is whether the account is still there after a restart, and
 * `storageMode()` reports which of the three is in play so the interface can say
 * so rather than leave it to be discovered.
 *
 * Every backend is reached through a dynamic `import()`. Beyond keeping server
 * code out of the browser graph, it is what lets the file backend fail softly
 * on a Worker instead of taking the whole route down with a missing `node:fs`.
 */

function binding<T>(name: string): T | undefined {
  return (globalThis as { __env__?: Record<string, unknown> }).__env__?.[name] as T | undefined;
}

let handle: Promise<{ store: Store; mode: StorageMode }> | null = null;

async function build(): Promise<{ store: Store; mode: StorageMode }> {
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
    return { store: documentStore(openBackend()), mode: "file" };
  } catch {
    // No writable disk, which is exactly the Worker case. Memory from here.
    const [{ documentStore }, { openBackend }] = await Promise.all([
      import("./document"),
      import("./memory"),
    ]);
    return { store: documentStore(openBackend()), mode: "memory" };
  }
}

function open(): Promise<{ store: Store; mode: StorageMode }> {
  handle ??= build();
  return handle;
}

/** Where the account data is going, so the interface can say so out loud. */
export async function storageMode(): Promise<StorageMode> {
  return (await open()).mode;
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
