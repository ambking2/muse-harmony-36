import { createServerFn } from "@tanstack/react-start";

import type { StoredPlaylist } from "./server/types";

export interface SharedResult {
  playlist: StoredPlaylist;
  isOwner: boolean;
}

/**
 * Reads a playlist for the `/p/$id` loader.
 *
 * Two constraints shape where this file lives. TanStack Start's import
 * protection refuses any static import resolving into its `server` directory
 * from a route, so the function sits out here rather than beside the store it
 * uses. And the store itself is reached through a dynamic import, so `node:fs`
 * never enters the client graph at all.
 *
 * Doing this in a loader rather than a `useQuery` is what lets a pasted link
 * render as the playlist itself instead of an empty shell waiting for
 * hydration — the same reason `/t/$key` resolves on the server.
 */
export const fetchSharedPlaylist = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<SharedResult | null> => {
    const { findPlaylist } = await import("./server/db");
    const playlist = await findPlaylist(id);
    if (!playlist) return null;
    // Only public playlists are resolved here. Ownership is settled by the
    // cookie in the HTTP endpoint; the loader has no session, and letting a
    // private playlist through it would leak the snapshot to anyone with the id.
    if (!playlist.isPublic) return null;
    return { playlist, isOwner: false };
  });
