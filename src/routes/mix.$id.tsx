import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Shuffle, ListMusic } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { getPlaylist } from "@/lib/gdmusic";
import { FEATURED_PLAYLISTS } from "@/lib/featured";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { usePlayer } from "@/stores/player";
import { toast } from "sonner";

export const Route = createFileRoute("/mix/$id")({
  head: () => ({ meta: [{ title: "پلی‌لیست — muis" }] }),
  component: MixPage,
});

function MixPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mix", id],
    staleTime: 60 * 60_000,
    queryFn: () => getPlaylist("netease", id),
  });

  const curated = FEATURED_PLAYLISTS.find((p) => p.id === id);
  const tracks = data?.tracks ?? [];
  const coverTrack = tracks[0];

  return (
    <AppShell>
      <Screen title="پلی‌لیست" back={{ to: "/explore" }} largeTitle={false}>
        <div className="pt-2">
          {isLoading && (
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-ios-label-secondary" />
            </div>
          )}

          {isError && (
            <EmptyState
              icon={ListMusic}
              title="این پلی‌لیست در دسترس نیست"
              description="شاید حذف شده باشد یا سرویس پاسخ ندهد."
              action={
                <button
                  type="button"
                  onClick={() => navigate({ to: "/explore" })}
                  className="btn btn-filled"
                >
                  رفتن به جستجو
                </button>
              }
            />
          )}

          {data && (
            <div>
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
                <div className="w-40 shrink-0 sm:w-52">
                  {coverTrack ? (
                    <Artwork
                      track={coverTrack}
                      size={500}
                      className="aspect-square w-full"
                      rounded="rounded-card"
                    />
                  ) : (
                    <div className="skeleton aspect-square w-full rounded-card" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-right">
                  <p className="type-footnote text-ios-label-secondary">پلی‌لیست</p>
                  <h1 className="type-title-1 mt-1 text-balance">
                    {data.name || curated?.title || "بدون نام"}
                  </h1>
                  {curated?.blurb && (
                    <p className="type-subheadline mt-2 text-ios-label-secondary">
                      {curated.blurb}
                    </p>
                  )}
                  <p className="type-footnote mt-2 text-ios-label-secondary ltr-nums">
                    {tracks.length.toLocaleString("fa-IR")} آهنگ
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={() => usePlayer.getState().playQueue(tracks, 0)}
                      className="btn btn-filled"
                    >
                      <Play className="size-4 fill-current" strokeWidth={0} />
                      پخش
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        usePlayer.getState().playQueue(tracks, 0);
                        usePlayer.getState().toggleShuffle();
                      }}
                      className="btn btn-gray"
                    >
                      <Shuffle className="size-4" strokeWidth={2} />
                      تصادفی
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        usePlayer.getState().addTracks(tracks);
                        toast.success("به صف اضافه شد");
                      }}
                      className="btn btn-gray"
                      aria-label="افزودن به صف"
                    >
                      <ListMusic className="size-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>

              {tracks.length > 0 && (
                <Section className="mt-6" title={`${tracks.length.toLocaleString("fa-IR")} آهنگ`}>
                  {tracks.map((t, i) => (
                    <TrackRow key={`${t.id}-${i}`} track={t} list={tracks} index={i} showIndex />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      </Screen>
    </AppShell>
  );
}
