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
 * Writes are also serialised through a queue. Two requests arriving together
 * would otherwise each read the same document and each write their own version,
 * and the second would silently drop the first one's change.
 */
const DATA_DIR = join(process.cwd(), ".data");
const DB_FILE = join(DATA_DIR, "muis.json");

export function openBackend(): DocumentBackend {
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
      queue = queue.then(async () => {
        const temporary = `${DB_FILE}.tmp`;
        writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
        renameSync(temporary, DB_FILE);
      });
      return queue;
    },
  };
}

export { DB_FILE };
