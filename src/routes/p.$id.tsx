import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, EyeOff, Globe, Play, Shuffle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Artwork } from "@/components/music/Artwork";
import { fetchSharedPlaylist } from "@/lib/shared-playlist";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";

export const Route = createFileRoute("/p/$id")({
  // Resolved on the server, exactly like /t/$key: a link pasted into a
  // messenger should unfurl as the playlist, not as a spinner.
  loader: ({ params }) => fetchSharedPlaylist({ data: params.id }),
  head: ({ match }) => {
    const data = match.loaderData;
    const name = data?.playlist.name;
    return {
      meta: [
        { title: name ? `${name} — muis` : "پلی‌لیست مشترک — muis" },
        {
          name: "description",
          content: data
            ? `پلی‌لیست «${name}» با ${data.playlist.tracks.length.toLocaleString("fa-IR")} آهنگ`
            : "این پلی‌لیست در دسترس نیست.",
        },
      ],
    };
  },
  component: SharedPlaylistPage,
});

/**
 * Someone else's playlist, opened from a link.
 *
 * The server sends a full snapshot of every track, so this page can render and
 * play without first searching for anything — the same guarantee `/t/<key>`
 * makes for a single track.
 */
function SharedPlaylistPage() {
  const data = Route.useLoaderData();
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const addToLibrary = useLibrary((s) => s.addToLibrary);

  // A private playlist returns nothing on purpose, so this page cannot tell
  // "deleted" from "not yours" — which is the point of hiding it.
  if (!data) {
    return (
      <AppShell>
        <div className="py-16 text-center">
          <EyeOff className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">این پلی‌لیست پیدا نشد، یا خصوصی است.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="size-4" />
            بازگشت به خانه
          </Link>
        </div>
      </AppShell>
    );
  }

  const { playlist } = data;
  const tracks = playlist.tracks;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-6">
          <div className="glass flex aspect-square w-36 shrink-0 items-center justify-center rounded-3xl sm:w-40">
            {tracks[0]?.pic_id ? (
              <Artwork track={tracks[0]} size={400} rounded="rounded-3xl" className="size-full" />
            ) : (
              <Play className="size-14 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Globe className="size-3.5" />
              پلی‌لیست عمومی
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight break-words">{playlist.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              از {playlist.owner} · {tracks.length.toLocaleString("fa-IR")} آهنگ
            </p>
          </div>
        </div>

        {tracks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => playQueue(tracks)}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Play className="size-4" />
              پخش
            </button>
            <button
              onClick={() => {
                toggleShuffle();
                playQueue(tracks);
              }}
              className="glass flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              <Shuffle className="size-4" />
              تصادفی
            </button>
            <button
              onClick={() => {
                tracks.forEach(addToLibrary);
                toast.success(`${tracks.length.toLocaleString("fa-IR")} آهنگ به کتابخانه اضافه شد`);
              }}
              className="glass rounded-full px-5 py-3 text-sm font-medium"
            >
              افزودن همه به کتابخانه
            </button>
          </div>
        )}

        <ul className="divide-y divide-border overflow-hidden rounded-3xl">
          {tracks.map((t, i) => (
            <li key={`${t.source}:${t.id}:${i}`}>
              <button
                onClick={() => playQueue(tracks, i)}
                className="flex w-full items-center gap-4 px-4 py-3 text-right transition hover:bg-accent"
              >
                <span className="w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                {t.pic_id && <Artwork track={t} size={96} className="size-11 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.artist.join("، ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
