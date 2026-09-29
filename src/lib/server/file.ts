import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { DocumentBackend, Snapshot } from "./document";

/**
 * The database as a JSON file on disk — `.data/muis.json`.
 *
 * One file, human-readable, openable in any editor. Reached through a dynamic
 * `import()` because it uses `node:fs`, which a Cloudflare Worker does not have;
 * when that import is missing the caller falls back to memory rather than
 * failing the route.
 *
 * Writes go to a temporary file and are then renamed over the real one. A plain
 * write truncates first, so a crash halfway through would leave half a file and
 * lose every account in it. A rename is atomic, so the file on disk is always
 * either the old document or the new one.
 *
 * Writes are serialised through a queue. Two requests arriving together would
 * otherwise each read the same document and each write their own version, and
 * the second would silently drop the first one's change. A failed write is
 * caught rather than left in the chain, so one bad moment does not turn every
 * later write into a 500 too.
 */
const DATA_DIR = join(process.cwd(), ".data");
const DB_FILE = join(DATA_DIR, "muis.json");

export function openBackend(onFailure?: (error: unknown) => void): DocumentBackend {
  mkdirSync(DATA_DIR, { recursive: true });
  let queue: Promise<void> = Promise.resolve();

  return {
    async read() {
      try {
        return JSON.parse(readFileSync(DB_FILE, "utf8")) as Snapshot;
      } catch {
        // Nothing stored yet, or a file someone is halfway through editing by
        // hand. Either way there is no document to start from.
        return null;
      }
    },

    write(snapshot) {
      queue = queue
        .then(async () => {
          // Made here as well as at open, because the directory can be removed
          // underneath a running server — and when it is, every later write
          // fails and every request that saves anything comes back a 500.
          mkdirSync(DATA_DIR, { recursive: true });
          const temporary = `${DB_FILE}.tmp`;
          writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
          renameSync(temporary, DB_FILE);
        })
        .catch((err) => {
          // Swallowed on purpose, and the queue recovers. A rejected promise
          // left in the chain poisons every write that follows it, so one
          // failure would otherwise be permanent. The document itself is safe:
          // the store's write-through cache still holds it, and the next write
          // tries the file again.
          onFailure?.(err);
        });
      return queue;
    },
  };
}

export { DB_FILE };
