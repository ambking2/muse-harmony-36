import { createFileRoute } from "@tanstack/react-router";
import { currentUser, SESSION_COOKIE } from "@/lib/server/auth";
import { listUsers, listAllPlaylists, findPlaylist, updatePlaylist, deletePlaylist } from "@/lib/server/db";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function readToken(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

async function admin(request: Request): Promise<boolean> {
  return (await currentUser(readToken(request))) === "amb";
}

async function handle(request: Request) {
  if (!(await admin(request))) return json({ error: "دسترسی مدیر لازم است" }, 403);

  if (request.method === "GET") {
    const [users, playlists] = await Promise.all([listUsers(), listAllPlaylists()]);
    const safeUsers = users.map((user) => ({
      username: user.username,
      createdAt: user.createdAt,
      disabled: Boolean(user.disabled),
    }));
    const safePlaylists = playlists.map((playlist) => ({
      id: playlist.id,
      owner: playlist.owner,
      name: playlist.name,
      isPublic: playlist.isPublic,
      updatedAt: playlist.updatedAt,
      count: playlist.tracks.length,
    }));
    return json({
      stats: {
        users: safeUsers.length,
        playlists: safePlaylists.length,
        publicPlaylists: safePlaylists.filter((p) => p.isPublic).length,
        tracks: safePlaylists.reduce((sum, p) => sum + p.count, 0),
      },
      users: safeUsers,
      playlists: safePlaylists,
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (request.method === "PATCH" && id) {
    const body = (await request.json().catch(() => ({}))) as { isPublic?: unknown };
    if (typeof body.isPublic !== "boolean") return json({ error: "isPublic باید بولی باشد" }, 400);
    const playlist = await findPlaylist(id);
    if (!playlist) return json({ error: "پلی‌لیست پیدا نشد" }, 404);
    await updatePlaylist({ ...playlist, isPublic: body.isPublic, updatedAt: Date.now() });
    return json({ ok: true });
  }

  if (request.method === "DELETE" && id) {
    const playlist = await findPlaylist(id);
    if (!playlist) return json({ error: "پلی‌لیست پیدا نشد" }, 404);
    const removed = await deletePlaylist(id, playlist.owner);
    return removed ? json({ ok: true }) : json({ error: "حذف انجام نشد" }, 409);
  }

  return json({ error: "روش پشتیبانی نمی‌شود" }, 405);
}

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      PATCH: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
