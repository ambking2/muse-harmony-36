import { createFileRoute } from "@tanstack/react-router";
import { currentUser, SESSION_COOKIE } from "@/lib/server/auth";
import { listUsers, listAllPlaylists, findPlaylist, updatePlaylist, deletePlaylist, setUserDisabled, deleteUser, storageMode, getFeaturedPlaylists, saveFeaturedPlaylists } from "@/lib/server/db";
import { FEATURED_PLAYLISTS, type FeaturedPlaylist } from "@/lib/featured";

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
    const [users, playlists, storage, savedFeatured] = await Promise.all([listUsers(), listAllPlaylists(), storageMode(), getFeaturedPlaylists()]);
    const featuredPlaylists = savedFeatured ?? FEATURED_PLAYLISTS;
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
        disabledUsers: safeUsers.filter((u) => u.disabled).length,
        tracks: safePlaylists.reduce((sum, p) => sum + p.count, 0),
      },
      users: safeUsers,
      playlists: safePlaylists,
      featuredPlaylists,
      storage,
      generatedAt: Date.now(),
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const featuredId = url.searchParams.get("featured");
  const username = url.searchParams.get("username");
  if (request.method === "PATCH" && featuredId) {
    const body = (await request.json().catch(() => ({}))) as Partial<FeaturedPlaylist>;
    const current = (await getFeaturedPlaylists()) ?? FEATURED_PLAYLISTS;
    const index = current.findIndex((p) => p.id === featuredId);
    if (index < 0) return json({ error: "مجموعه پیدا نشد" }, 404);
    const next = [...current];
    next[index] = {
      ...next[index],
      ...(typeof body.title === "string" ? { title: body.title.trim().slice(0, 80) } : {}),
      ...(typeof body.blurb === "string" ? { blurb: body.blurb.trim().slice(0, 180) } : {}),
      ...(typeof body.emoji === "string" ? { emoji: body.emoji.trim().slice(0, 8) } : {}),
      ...(typeof body.query === "string" ? { query: body.query.trim().slice(0, 160) } : {}),
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? { sortOrder: body.sortOrder } : {}),
      ...(body.group === "ایرانی" || body.group === "سبک" || body.group === "بین‌المللی" ? { group: body.group } : {}),
    };
    if (!next[index].title) return json({ error: "عنوان نمی‌تواند خالی باشد" }, 400);
    await saveFeaturedPlaylists(next);
    return json({ ok: true });
  }

  if (request.method === "POST" && featuredId === "new") {
    const body = (await request.json().catch(() => ({}))) as Partial<FeaturedPlaylist>;
    const current = (await getFeaturedPlaylists()) ?? FEATURED_PLAYLISTS;
    const newId = String(body.id ?? "").trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(newId) || current.some((p) => p.id === newId)) return json({ error: "شناسه نامعتبر یا تکراری است" }, 400);
    if (!String(body.title ?? "").trim() || !String(body.query ?? "").trim()) return json({ error: "عنوان و عبارت جستجو الزامی است" }, 400);
    const item: FeaturedPlaylist = { id: newId, title: String(body.title).trim().slice(0,80), blurb: String(body.blurb ?? "").trim().slice(0,180), emoji: String(body.emoji ?? "🎵").slice(0,8), group: body.group === "سبک" || body.group === "بین‌المللی" ? body.group : "ایرانی", query: String(body.query).trim().slice(0,160), enabled: true, sortOrder: current.length };
    await saveFeaturedPlaylists([...current, item]);
    return json({ ok: true, item }, 201);
  }

  if (request.method === "DELETE" && featuredId) {
    const current = (await getFeaturedPlaylists()) ?? FEATURED_PLAYLISTS;
    if (!current.some((p) => p.id === featuredId)) return json({ error: "مجموعه پیدا نشد" }, 404);
    await saveFeaturedPlaylists(current.filter((p) => p.id !== featuredId));
    return json({ ok: true });
  }

  if (request.method === "PATCH" && username) {
    if (username === "amb") return json({ error: "حساب مدیر اصلی قابل تعلیق نیست" }, 400);
    const body = (await request.json().catch(() => ({}))) as { disabled?: unknown };
    if (typeof body.disabled !== "boolean") return json({ error: "disabled باید بولی باشد" }, 400);
    const changed = await setUserDisabled(username, body.disabled);
    return changed ? json({ ok: true }) : json({ error: "کاربر پیدا نشد" }, 404);
  }

  if (request.method === "DELETE" && username) {
    if (username === "amb") return json({ error: "حساب مدیر اصلی قابل حذف نیست" }, 400);
    const removed = await deleteUser(username);
    return removed ? json({ ok: true }) : json({ error: "کاربر پیدا نشد" }, 404);
  }

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
      POST: ({ request }) => handle(request),
    },
  },
});
