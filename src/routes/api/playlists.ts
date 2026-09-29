import { createFileRoute } from "@tanstack/react-router";

import { currentUser, SESSION_COOKIE } from "@/lib/server/auth";
import { mutate, readState } from "@/lib/server/store";
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
    const playlist = await readState((s) => s.playlists.find((p) => p.id === id));
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
    const playlists = await readState((s) =>
      s.playlists.filter((p) => p.owner === user).map(summarise),
    );
    return json({ playlists });
  }

  if (!user) return json({ error: "unauthorized" }, 401);
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    isPublic?: boolean;
    tracks?: Track[];
  };

  if (request.method === "POST" && id) {
    const owned = await readState((s) => s.playlists.some((p) => p.id === id && p.owner === user));
    if (!owned) return json({ error: "not found" }, 404);
    await mutate((s) => {
      const p = s.playlists.find((x) => x.id === id && x.owner === user);
      if (!p) return;
      if (typeof body.isPublic === "boolean") p.isPublic = body.isPublic;
      if (typeof body.name === "string" && body.name.trim()) p.name = body.name.trim();
      if (Array.isArray(body.tracks)) p.tracks = body.tracks;
      p.updatedAt = Date.now();
    });
    return json({ ok: true });
  }

  if (request.method === "POST") {
    const name = (body.name ?? "").trim();
    if (!name) return json({ error: "name required" }, 400);
    const playlist: StoredPlaylist = {
      // 10 chars of base32 is 50 bits — short enough to read aloud or paste,
      // wide enough that guessing one is not a practical attack.
      id: crypto.randomUUID().slice(0, 8),
      owner: user,
      name,
      isPublic: body.isPublic ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: Array.isArray(body.tracks) ? body.tracks : [],
    };
    await mutate((s) => {
      s.playlists.push(playlist);
    });
    return json({ playlist: summarise(playlist) }, 200);
  }

  if (request.method === "DELETE" && id) {
    const removed = await mutate((s) => {
      const i = s.playlists.findIndex((p) => p.id === id && p.owner === user);
      if (i < 0) return false;
      s.playlists.splice(i, 1);
      return true;
    });
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
