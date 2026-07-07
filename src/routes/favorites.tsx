import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { TrackRow } from "@/components/music/TrackRow";
import { trackKey } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { Heart, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/favorites")({ component: FavoritesPage });

function FavoritesPage() {
  const favorites = useLibrary((s) => s.favorites);
  const tracksById = useLibrary((s) => s.tracksById);
  const favArtists = useLibrary((s) => s.favoriteArtists);
  const playQueue = usePlayer((s) => s.playQueue);

  const tracks = favorites.map((k) => tracksById[k]).filter(Boolean);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Loved</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Favorites</h1>
          </div>
          {tracks.length > 0 && (
            <button
              onClick={() => playQueue(tracks, 0)}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
            >
              <Play className="size-4" /> Play all
            </button>
          )}
        </div>

        {favArtists.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Favorite artists</h2>
            <div className="flex flex-wrap gap-2">
              {favArtists.map((a) => (
                <Link
                  key={a}
                  to="/artist/$name"
                  params={{ name: a }}
                  className="glass rounded-full px-4 py-2 text-sm"
                >
                  {a}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          {tracks.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Heart className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No favorites yet — tap the heart on any song.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tracks.map((t, i) => (
                <TrackRow key={trackKey(t)} track={t} list={tracks} index={i} showIndex />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}