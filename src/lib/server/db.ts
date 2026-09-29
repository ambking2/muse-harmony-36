import type { D1Database } from "./d1";
import type { KVNamespace } from "./kv";
import type { Store } from "./store";

import type { StoredPlaylist, UserRecord } from "./types";

/**
 * The account database.
 *
 * It is the same three questions wherever it runs, and only the storage differs:
 *
 *   - On the deployed Cloudflare worker, a binding: KV when one is set, else D1.
 *   - In development and the preview, a SQLite file at `.data/muis.sqlite`.
 *
 * The file is the default because it needs nothing set up at all. A worker has
 * no disk, so there a binding is the only way to keep an account alive across a
 * cold start; which one is a line in `wrangler.jsonc`.
 *
 * With no binding and no writable disk, `isDurable()` reports false and the
 * account routes say so rather than accepting a registration that would be gone
 * by the next restart.
 *
 * Every backend is reached through a dynamic `import()`. That is not only about
 * keeping server code out of the browser graph: the file backend uses `node:fs`
 * and `node:sqlite`, which Workers does not have, so loading it eagerly would
 * fail the whole account route on the worker instead of letting a binding serve
 * it.
 */
function binding<T>(name: string): T | undefined {
  return (globalThis as { __env__?: Record<string, unknown> }).__env__?.[name] as T | undefined;
}

let handle: Promise<Store> | null = null;

function open(): Promise<Store> {
  handle ??= (async () => {
    const kv = binding<KVNamespace>("MUIS");
    const store = kv
      ? (await import("./kv")).openStore(kv)
      : await (async () => {
          const d1 = binding<D1Database>("DB");
          return (await import("./sql")).openStore(
            d1 ? (await import("./d1")).openDatabase(d1) : undefined,
          );
        })();
    // Once per process, before anything reads. The file and D1 both create
    // their tables here; KV has nothing to create.
    await store.migrate();
    return store;
  })();
  return handle;
}

/**
 * Whether accounts can work here.
 *
 * A real query rather than a look at the environment, because on a worker with
 * no binding it is the open that fails, not the configuration. Cached: it cannot
 * change without a restart, and every render asks.
 */
let healthy: Promise<boolean> | null = null;

export function isDurable(): Promise<boolean> {
  healthy ??= open().then(
    () => true,
    () => false,
  );
  return healthy;
}

/**
 * Forgets which backend was opened, so the next call picks again.
 *
 * Test seam only. The cache is module state, so a suite that installs a binding
 * and expects to be served by it has to be able to say so — otherwise whichever
 * suite happens to run first decides the backend for all the others, and the
 * rest quietly test something other than what they claim to.
 */
export function resetForTests(): void {
  handle = null;
  healthy = null;
}

/* -------------------------------------------------------------------- users */

export async function findUser(username: string): Promise<UserRecord | null> {
  return (await open()).findUser(username);
}

/**
 * False when the name is already taken.
 *
 * What guarantees that differs by backend, and each does the best it can: the
 * file and D1 both let the database refuse the second insert, while KV has no
 * conditional write and so has to check first.
 */
export async function createUser(user: UserRecord): Promise<boolean> {
  return (await open()).createUser(user);
}

export async function updateUser(
  username: string,
  patch: { passwordHash: string; salt: string; recoveryHashes: string[] },
): Promise<void> {
  return (await open()).updateUser(username, patch);
}

/* ----------------------------------------------------------------- sessions */

export async function getSession(sid: string): Promise<{ username: string; at: number } | null> {
  return (await open()).getSession(sid);
}

export async function putSession(sid: string, username: string, at: number): Promise<void> {
  return (await open()).putSession(sid, username, at);
}

export async function deleteSession(sid: string): Promise<void> {
  return (await open()).deleteSession(sid);
}

export async function deleteSessionsFor(username: string): Promise<void> {
  return (await open()).deleteSessionsFor(username);
}

/* ---------------------------------------------------------------- playlists */

export async function findPlaylist(id: string): Promise<StoredPlaylist | null> {
  return (await open()).findPlaylist(id);
}

export async function listPlaylistsByOwner(owner: string): Promise<StoredPlaylist[]> {
  return (await open()).listPlaylistsByOwner(owner);
}

export async function insertPlaylist(playlist: StoredPlaylist): Promise<void> {
  return (await open()).insertPlaylist(playlist);
}

export async function updatePlaylist(playlist: StoredPlaylist): Promise<void> {
  return (await open()).updatePlaylist(playlist);
}

export async function deletePlaylist(id: string, owner: string): Promise<boolean> {
  return (await open()).deletePlaylist(id, owner);
}
