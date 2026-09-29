import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Shuffle, ListMusic } from "lucide-react";
import { AppShell, BackLink } from "@/components/layout/AppShell";
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
      <BackLink />

      {isLoading && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">این پلی‌لیست در دسترس نیست.</p>
          <button
            onClick={() => navigate({ to: "/explore" })}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            رفتن به جستجو
          </button>
        </div>
      )}

      {data && (
        <div>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
            <div className="w-40 shrink-0 overflow-hidden rounded-2xl shadow-2xl sm:w-52">
              {coverTrack ? (
                <Artwork
                  track={coverTrack}
                  size={500}
                  className="aspect-square w-full"
                  rounded="rounded-2xl"
                />
              ) : (
                <div className="skeleton aspect-square w-full rounded-2xl" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-right">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                پلی‌لیست
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-balance sm:text-4xl">
                {data.name || curated?.title || "بدون نام"}
              </h1>
              {curated?.blurb && (
                <p className="mt-2 text-sm text-muted-foreground">{curated.blurb}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground ltr-nums">
                {tracks.length.toLocaleString("fa-IR")} آهنگ
              </p>

              <div className="mt-5 flex justify-center gap-2 sm:justify-start">
                <button
                  onClick={() => usePlayer.getState().playQueue(tracks, 0)}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95"
                >
                  <Play className="size-4" /> پخش
                </button>
                <button
                  onClick={() => {
                    usePlayer.getState().playQueue(tracks, 0);
                    usePlayer.getState().toggleShuffle();
                  }}
                  className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition hover:bg-white/10"
                >
                  <Shuffle className="size-4" /> تصادفی
                </button>
                <button
                  onClick={() => {
                    usePlayer.getState().addTracks(tracks);
                    toast.success("به صف اضافه شد");
                  }}
                  className="glass flex size-10 items-center justify-center rounded-full transition hover:bg-white/10"
                  aria-label="افزودن به صف"
                >
                  <ListMusic className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-1">
            {tracks.map((t, i) => (
              <TrackRow key={`${t.id}-${i}`} track={t} list={tracks} index={i} showIndex />
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
