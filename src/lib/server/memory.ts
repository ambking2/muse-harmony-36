import type { DocumentBackend } from "./document";

/**
 * The database in memory, for anywhere a file cannot be written.
 *
 * A Cloudflare Worker has no disk, so on the deployed worker this is what an
 * account lands in. It is deliberately the last fallback rather than an error:
 * signing up works, playlists can be shared inside the life of one server, and
 * nothing throws. What it cannot promise is surviving a restart — every isolate
 * keeps its own copy, and a new one starts empty. That is said plainly in the
 * interface rather than hidden, because an account that quietly disappears is
 * worse than one that was never accepted.
 *
 * There is nothing to serialise, so a simple module variable is the whole
 * backend.
 */
let held: unknown = null;

export function openBackend(): DocumentBackend {
  return {
    read: async () => held as never,
    write: async (snapshot) => {
      held = snapshot;
    },
  };
}
