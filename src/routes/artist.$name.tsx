import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { searchTracks } from "@/lib/gdmusic";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { trackKey } from "@/lib/types";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { Heart, Play, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/artist/$name")({ component: ArtistPage });

function ArtistPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const favoriteArtists = useLibrary((s) => s.favoriteArtists);
  const toggleFavArtist = useLibrary((s) => s.toggleFavoriteArtist);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  const q = useQuery({
    queryKey: ["artist", decoded],
    queryFn: () => searchTracks(decoded, { count: 50 }),
    staleTime: 5 * 60_000,
  });

  const tracks = (q.data ?? []).filter((t) =>
    t.artist.some((a) => a.toLowerCase() === decoded.toLowerCase()),
  );
  const list = tracks.length ? tracks : (q.data ?? []);
  const hero = list[0];
  const isFav = favoriteArtists.includes(decoded);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="relative -mx-4 -mt-6 h-64 overflow-hidden sm:-mx-6">
          {hero && <Artwork track={hero} size={800} className="size-full" rounded="rounded-none" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Artist</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight">{decoded}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => playQueue(list, 0)}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Play className="size-4" /> Play
          </button>
          <button
            onClick={() => { playQueue(list, 0); toggleShuffle(); }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
          >
            <Shuffle className="size-4" /> Shuffle
          </button>
          <button
            onClick={() => toggleFavArtist(decoded)}
            className={cn(
              "flex size-11 items-center justify-center rounded-full text-muted-foreground",
              isFav && "text-primary",
            )}
          >
            <Heart className={cn("size-5", isFav && "fill-current")} />
          </button>
        </div>

        <div className="space-y-1">
          {q.isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="skeleton size-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-2 w-1/3 rounded" />
                </div>
              </div>
            ))}
          {list.map((t, i) => (
            <TrackRow key={trackKey(t)} track={t} list={list} index={i} showIndex />
          ))}
        </div>
      </div>
    </AppShell>
  );
}