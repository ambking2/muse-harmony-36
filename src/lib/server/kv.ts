import type { DocumentBackend, Snapshot } from "./document";

/**
 * The database as one JSON value on Cloudflare Workers KV.
 *
 * Optional, and not required for anything to work: with no `MUIS` binding the
 * caller falls back to a file or to memory. When it is there it is the one
 * place an account survives a restart on a Worker, which is worth having and
 * costs nothing to leave out.
 *
 * One key, `muis`, holding the whole document.
 *
 * Superseded by D1 (`d1.ts`) and kept for a worker set up before it. One
 * difference worth knowing: KV reads are eventually consistent, so a Worker
 * reading straight back after a write can see the previous value for a second
 * or so. D1 is not like that, which is part of why it is the one to use.
 */
export interface KVNamespace {
  get(key: string, type: "text"): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

const KEY = "muis";

export function openBackend(namespace: KVNamespace): DocumentBackend {
  return {
    read: async () => {
      const text = await namespace.get(KEY, "text");
      return text ? (JSON.parse(text) as Snapshot) : null;
    },
    write: (snapshot) => namespace.put(KEY, JSON.stringify(snapshot)),
  };
}
