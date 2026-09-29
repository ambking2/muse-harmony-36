/**
 * Server-side persistence for accounts and shared playlists.
 *
 * Written against a plain file so the app runs with no external service. That
 * is not free: the deployment target is Cloudflare Workers, whose filesystem is
 * read-only and whose /tmp is wiped between requests, so a file written in a
 * production deploy comes back empty on the next cold start. It works in local
 * development, which is where this runs today.
 *
 * Everything above this file talks to `readState` / `mutate` only, so swapping
 * in Turso (or any HTTP SQLite) means reimplementing these two functions and
 * nothing else. `isDurable()` reports which mode is live so the UI can say so
 * out loud rather than quietly losing a playlist.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { StoredPlaylist, UserRecord } from "./types";

const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "muis.json");

/** Bumped when a field changes shape; `migrate` upgrades older files in place. */
const SCHEMA_VERSION = 1;

interface State {
  version: number;
  users: UserRecord[];
  playlists: StoredPlaylist[];
  /** Session token hash -> owner and issue time. Raw tokens are never written down. */
  sessions: Record<string, { username: string; at: number }>;
}

function emptyState(): State {
  return { version: SCHEMA_VERSION, users: [], playlists: [], sessions: {} };
}

/**
 * Every read and write goes through this one lock.
 *
 * Two concurrent requests both read the file, both mutate their copy, and the
 * second write silently discards the first — losing a whole playlist. Chaining
 * the work on a single promise turns that race into a queue.
 */
let chain: Promise<unknown> = Promise.resolve();

function serialise<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  // Keep the chain alive even when one link rejects, or every later caller
  // would reject with the same stale error.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * True when the process can actually keep data between requests.
 *
 * Cloudflare Workers import `node:fs` successfully but every call fails, so the
 * capability is probed rather than inferred from the platform.
 */
let durable: boolean | undefined;

export async function isDurable(): Promise<boolean> {
  if (durable !== undefined) return durable;
  try {
    const { stat, writeFile: wf } = await import("node:fs/promises");
    const probe = join(DATA_DIR, ".probe");
    await stat(DATA_DIR).catch(() => mkdir(DATA_DIR, { recursive: true }));
    await wf(probe, "1");
    durable = true;
  } catch {
    durable = false;
  }
  return durable;
}

async function load(): Promise<State> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<State>;
    if (parsed.version !== SCHEMA_VERSION) return migrate(parsed);
    return {
      version: SCHEMA_VERSION,
      users: parsed.users ?? [],
      playlists: parsed.playlists ?? [],
      sessions: parsed.sessions ?? {},
    };
  } catch (err) {
    // ENOENT is just a fresh install. Anything else is a real problem and must
    // not be mistaken for "no data" — that would wipe the file on next write.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw err;
  }
}

function migrate(old: Partial<State>): State {
  return { ...emptyState(), ...old, version: SCHEMA_VERSION };
}

/**
 * Write via a temp file and rename.
 *
 * A half-written JSON file is unrecoverable, and a crash mid-write is exactly
 * when the process is least able to report the problem. rename is atomic
 * within a filesystem, so a reader sees either the old file or the new one.
 */
async function save(state: State): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(state), "utf8");
  await rename(tmp, DATA_FILE);
}

export function readState<T>(select: (s: State) => T): Promise<T> {
  return serialise(async () => select(await load()));
}

export function mutate<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
  return serialise(async () => {
    const state = await load();
    const result = await fn(state);
    await save(state);
    return result;
  });
}
