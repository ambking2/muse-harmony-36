import { createFileRoute, Link } from "@tanstack/react-router";
import { EyeOff, Globe, Play, Shuffle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { Artwork } from "@/components/music/Artwork";
import { TrackRow } from "@/components/music/TrackRow";
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
        <EmptyState
          icon={EyeOff}
          title="این پلی‌لیست پیدا نشد"
          description="شاید حذف شده باشد یا به‌صورت خصوصی منتشر شده باشد."
          className="py-16"
          action={
            <Link to="/" className="btn btn-filled">
              بازگشت به خانه
            </Link>
          }
        />
      </AppShell>
    );
  }

  const { playlist } = data;
  const tracks = playlist.tracks;

  return (
    <AppShell>
      <Screen title="پلی‌لیست عمومی" back={{ to: "/explore" }} largeTitle={false}>
        <div className="space-y-5 pt-2">
          <div className="flex flex-wrap items-end gap-5">
            <div className="media-tile w-36 shrink-0 bg-ios-surface sm:w-40">
              {tracks[0]?.pic_id ? (
                <Artwork track={tracks[0]} size={400} rounded="media-tile" className="size-full" />
              ) : (
                <span className="grid size-full place-items-center">
                  <Play className="size-14 text-ios-tint" strokeWidth={1.5} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="type-footnote flex items-center gap-1.5 text-ios-tint">
                <Globe className="size-3.5" />
                پلی‌لیست عمومی
              </p>
              <h1 className="type-title-1 mt-1 break-words">{playlist.name}</h1>
              <p className="type-subheadline mt-1 text-ios-label-secondary">
                از {playlist.owner} · {tracks.length.toLocaleString("fa-IR")} آهنگ
              </p>
            </div>
          </div>

          {tracks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => playQueue(tracks)} className="btn btn-filled">
                <Play className="size-4 fill-current" strokeWidth={0} />
                پخش
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleShuffle();
                  playQueue(tracks);
                }}
                className="btn btn-gray"
              >
                <Shuffle className="size-4" strokeWidth={2} />
                تصادفی
              </button>
              <button
                type="button"
                onClick={() => {
                  tracks.forEach(addToLibrary);
                  toast.success(
                    `${tracks.length.toLocaleString("fa-IR")} آهنگ به کتابخانه اضافه شد`,
                  );
                }}
                className="btn btn-gray"
              >
                افزودن همه به کتابخانه
              </button>
            </div>
          )}

          <Section title={`${tracks.length.toLocaleString("fa-IR")} آهنگ`}>
            {tracks.map((track, index) => (
              <TrackRow
                key={`${track.source}:${track.id}:${index}`}
                track={track}
                list={tracks}
                index={index}
                showIndex
              />
            ))}
          </Section>
        </div>
      </Screen>
    </AppShell>
  );
}
