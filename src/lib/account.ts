/**
 * Client half of the account system.
 *
 * The session lives in an HttpOnly cookie, so nothing here holds a token — the
 * browser cannot read it, which is the point. Every call is `credentials:
 * "same-origin"` so the cookie rides along.
 */

import { useQuery } from "@tanstack/react-query";
import type { Track } from "./types";

export interface SessionInfo {
  username: string | null;
  /** False when the account database is unreachable — see lib/server/db. */
  durable: boolean;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `درخواست ناموفق بود (${res.status})`);
  return body;
}

export const accountApi = {
  me: () => call<SessionInfo>("/api/auth?action=me"),
  register: (username: string, password: string) =>
    call<{ username: string; recoveryCodes: string[] }>("/api/auth?action=register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    call<{ username: string }>("/api/auth?action=login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  recover: (username: string, code: string, password: string) =>
    call<{ ok: true }>("/api/auth?action=recover", {
      method: "POST",
      body: JSON.stringify({ username, code, password }),
    }),
  logout: () => call<{ ok: true }>("/api/auth?action=logout", { method: "POST" }),
};

export interface PlaylistSummary {
  id: string;
  name: string;
  isPublic: boolean;
  updatedAt: number;
  count: number;
}

export const playlistApi = {
  mine: () => call<{ playlists: PlaylistSummary[] }>("/api/playlists"),
  publish: (id: string, patch: { isPublic?: boolean; name?: string; tracks?: Track[] }) =>
    call<{ ok: true }>(`/api/playlists?id=${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(patch),
    }),
  create: (name: string, tracks: Track[], isPublic: boolean) =>
    call<{ playlist: PlaylistSummary }>("/api/playlists", {
      method: "POST",
      body: JSON.stringify({ name, tracks, isPublic }),
    }),
  remove: (id: string) =>
    call<{ ok: true }>(`/api/playlists?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Signed-in user, refetched whenever a mutation invalidates it. */
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: accountApi.me,
    // The cookie can change on any tab, but polling would be noise; the
    // staleness window only matters right after a sign-in or sign-out.
    staleTime: 30_000,
    retry: false,
  });
}
