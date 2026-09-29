import { createFileRoute } from "@tanstack/react-router";

import { currentUser, SESSION_COOKIE } from "@/lib/server/auth";
import { getLibrary, saveLibrary } from "@/lib/server/db";
import type { LibraryDocument, Track } from "@/lib/types";

/**
 * The library that belongs to the signed-in account.
 *
 * One document per person, read on sign-in and written on every change. It is
 * the same document the device keeps in localStorage, so the move between them
 * is a copy rather than a conversion — which is also why there is no schema to
 * migrate when the app grows a new field: the client sends what it has.
 *
 * The body is checked rather than trusted. A session is not permission to write
 * an unbounded blob into somebody's account, so every field has a shape and a
 * ceiling, and a value that fails is dropped instead of rejected — a client two
 * versions from now sending an extra field should not cost you your library.
 */

const MAX_TRACKS = 2000;
const MAX_IDS = 2000;
const MAX_PLAYLISTS = 200;
const MAX_NAME = 200;

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

function text(value: unknown, max = MAX_NAME): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function isTrack(value: unknown): value is Track {
  const t = value as Track | null;
  return !!t && typeof t === "object" && typeof t.id === "string" && typeof t.name === "string";
}

/** A list of track keys or artist names; anything else in it is dropped. */
function list(value: unknown, max = MAX_IDS): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .slice(0, max)
    .map((v) => v.slice(0, MAX_NAME));
}

function normalise(value: unknown): LibraryDocument {
  const raw = (value ?? {}) as Record<string, unknown>;

  const tracks = Array.isArray(raw.library) ? raw.library.filter(isTrack).slice(0, MAX_TRACKS) : [];

  const playlists = Array.isArray(raw.playlists)
    ? raw.playlists
        .filter((p): p is PlaylistLike => {
          const item = p as PlaylistLike | null;
          return !!item && typeof item === "object" && typeof item.id === "string";
        })
        .slice(0, MAX_PLAYLISTS)
        .map((p) => ({
          id: text(p.id, 64),
          name: text(p.name),
          createdAt: Number(p.createdAt) || 0,
          updatedAt: Number(p.updatedAt) || 0,
          cover: typeof p.cover === "string" ? p.cover.slice(0, 512) : undefined,
          trackKeys: list(p.trackKeys),
        }))
    : [];

  const tracksById: Record<string, Track> = {};
  const cache = (raw.tracksById ?? {}) as Record<string, unknown>;
  for (const [key, track] of Object.entries(cache)) {
    if (Object.keys(tracksById).length >= MAX_TRACKS) break;
    if (isTrack(track)) tracksById[key.slice(0, 200)] = track;
  }

  const history = Array.isArray(raw.history)
    ? raw.history
        .filter(
          (h): h is { key: string; at: number } =>
            !!h && typeof (h as { key?: unknown }).key === "string",
        )
        .slice(0, MAX_IDS)
        .map((h) => ({ key: text(h.key, 200), at: Number(h.at) || 0 }))
    : [];

  return {
    library: tracks,
    favorites: list(raw.favorites),
    favoriteArtists: list(raw.favoriteArtists),
    history,
    searchHistory: list(raw.searchHistory, 100),
    playlists,
    tracksById,
  };
}

interface PlaylistLike {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cover?: string;
  trackKeys: string[];
}

async function handle(request: Request) {
  const user = await currentUser(readToken(request));
  if (!user) return json({ error: "unauthorized" }, 401);

  if (request.method === "GET") {
    return json({ library: await getLibrary(user) });
  }

  if (request.method === "PUT" || request.method === "POST") {
    const body = (await request.json().catch(() => null)) as { library?: unknown } | null;
    await saveLibrary(user, normalise(body?.library));
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}

export const Route = createFileRoute("/api/library")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      PUT: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
