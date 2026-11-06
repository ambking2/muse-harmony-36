import { createFileRoute } from "@tanstack/react-router";
import { getFeaturedPlaylists } from "@/lib/server/db";
import { FEATURED_PLAYLISTS } from "@/lib/featured";

export const Route = createFileRoute("/api/featured-playlists")({
  server: {
    handlers: {
      GET: async () => {
        const playlists = (await getFeaturedPlaylists()) ?? FEATURED_PLAYLISTS;
        return new Response(JSON.stringify({
          playlists: playlists.filter((p) => p.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
      },
    },
  },
});
