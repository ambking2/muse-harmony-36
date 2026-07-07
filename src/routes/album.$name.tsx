import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { searchTracks } from "@/lib/gdmusic";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { trackKey } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { Play } from "lucide-react";

export const Route = createFileRoute("/album/$name")({ component: AlbumPage });

function AlbumPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const playQueue = usePlayer((s) => s.playQueue);

  const q = useQuery({
    queryKey: ["album", decoded],
    queryFn: () => searchTracks(decoded, { count: 50 }),
    staleTime: 5 * 60_000,
  });

  const list = (q.data ?? []).filter(
    (t) => t.album?.toLowerCase() === decoded.toLowerCase(),
  );
  const shown = list.length ? list : (q.data ?? []);
  const hero = shown[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          {hero && (
            <Artwork track={hero} size={500} className="aspect-square w-full max-w-xs" rounded="rounded-3xl" />
          )}
          <div className="flex-1 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Album</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{decoded}</h1>
            {hero && <p className="text-muted-foreground">{hero.artist.join(", ")}</p>}
            <button
              onClick={() => playQueue(shown, 0)}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30"
            >
              <Play className="size-4" /> Play
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {shown.map((t, i) => (
            <TrackRow key={trackKey(t)} track={t} list={shown} index={i} showIndex />
          ))}
        </div>
      </div>
    </AppShell>
  );
}