import { createFileRoute } from "@tanstack/react-router";

import { currentUser, SESSION_COOKIE } from "@/lib/server/auth";
import {
  deletePlaylist,
  findPlaylist,
  insertPlaylist,
  listPlaylistsByOwner,
  updatePlaylist,
} from "@/lib/server/db";
import type { StoredPlaylist } from "@/lib/server/types";
import type { Track } from "@/lib/types";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function readToken(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

/**
 * Only the fields a list row needs. The full track snapshots can run to tens of
 * kilobytes, and a page that shows six playlists should not download all of it.
 */
function summarise(p: StoredPlaylist) {
  return {
    id: p.id,
    name: p.name,
    isPublic: p.isPublic,
    updatedAt: p.updatedAt,
    count: p.tracks.length,
  };
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const user = await currentUser(readToken(request));

  // Reading a public playlist is the one action open to signed-out visitors —
  // it is the entire point of a public link.
  if (request.method === "GET" && id) {
    const playlist = await findPlaylist(id);
    if (!playlist) return json({ error: "not found" }, 404);
    if (!playlist.isPublic && playlist.owner !== user) {
      // Deliberately indistinguishable from "does not exist": confirming that a
      // private playlist is real would leak its existence to anyone guessing ids.
      return json({ error: "not found" }, 404);
    }
    return json({ playlist, isOwner: playlist.owner === user });
  }

  if (request.method === "GET") {
    if (!user) return json({ error: "unauthorized" }, 401);
    const playlists = (await listPlaylistsByOwner(user)).map(summarise);
    return json({ playlists });
  }

  if (!user) return json({ error: "unauthorized" }, 401);
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    isPublic?: boolean;
    tracks?: Track[];
  };

  if (request.method === "POST" && id) {
    const existing = await findPlaylist(id);
    if (!existing || existing.owner !== user) return json({ error: "not found" }, 404);
    const next: StoredPlaylist = {
      ...existing,
      name: (body.name ?? "").trim() || existing.name,
      isPublic: typeof body.isPublic === "boolean" ? body.isPublic : existing.isPublic,
      tracks: Array.isArray(body.tracks) ? body.tracks : existing.tracks,
      updatedAt: Date.now(),
    };
    await updatePlaylist(next);
    return json({ ok: true });
  }

  if (request.method === "POST") {
    const name = (body.name ?? "").trim();
    if (!name) return json({ error: "name required" }, 400);
    const playlist: StoredPlaylist = {
      // 8 hex characters of a v4 UUID is 32 bits. Short enough to read aloud or
      // paste, and every request that touches a private playlist is scoped to
      // the owner, so the id is an identifier rather than the only secret.
      id: crypto.randomUUID().slice(0, 8),
      owner: user,
      name,
      isPublic: body.isPublic ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: Array.isArray(body.tracks) ? body.tracks : [],
    };
    await insertPlaylist(playlist);
    return json({ playlist: summarise(playlist) }, 200);
  }

  if (request.method === "DELETE" && id) {
    const removed = await deletePlaylist(id, user);
    return removed ? json({ ok: true }) : json({ error: "not found" }, 404);
  }

  return json({ error: "method not allowed" }, 405);
}

export const Route = createFileRoute("/api/playlists")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
