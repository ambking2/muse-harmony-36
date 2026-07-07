import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { searchTracks } from "@/lib/gdmusic";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";
import { Play, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

const CURATED = ["today's hits", "chill vibes", "lofi beats", "workout", "romantic"];

function Home() {
  const library = useLibrary((s) => s.library);
  const history = useLibrary((s) => s.history);
  const tracksById = useLibrary((s) => s.tracksById);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const playQueue = usePlayer((s) => s.playQueue);

  const trending = useQuery({
    queryKey: ["home-trending"],
    queryFn: () => searchTracks("top hits 2025", { count: 12 }),
    staleTime: 10 * 60_000,
  });

  const recentlyPlayed: Track[] = history
    .slice(0, 10)
    .map((h) => tracksById[h.key])
    .filter(Boolean);

  const continueListening = recentlyPlayed.slice(0, 6);

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Good vibes</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Welcome back
            </h1>
          </div>
          <Link
            to="/explore"
            className="glass rounded-full px-4 py-2 text-sm font-medium text-foreground"
          >
            Explore
          </Link>
        </header>

        {/* Quick tags */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {CURATED.map((c) => (
            <Link
              key={c}
              to="/explore"
              search={{ q: c } as never}
              className="glass shrink-0 rounded-full px-4 py-2 text-sm capitalize text-foreground/90"
            >
              {c}
            </Link>
          ))}
        </div>

        {continueListening.length > 0 && (
          <Section title="Continue listening">
            <HScroll>
              {continueListening.map((t) => (
                <TrackCard key={trackKey(t)} track={t} list={recentlyPlayed} />
              ))}
            </HScroll>
          </Section>
        )}

        {library.length > 0 && (
          <Section
            title="Your library"
            action={
              <button
                onClick={() => playQueue(library, 0)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                <Play className="size-4" /> Play all
              </button>
            }
          >
            <div className="space-y-1">
              {library.slice(0, 6).map((t, i) => (
                <TrackRow key={trackKey(t)} track={t} index={i} list={library} />
              ))}
            </div>
          </Section>
        )}

        {playlists.length > 0 && (
          <Section title="Your playlists">
            <HScroll>
              {playlists.map((p) => (
                <Link
                  key={p.id}
                  to="/playlist/$id"
                  params={{ id: p.id }}
                  className="w-40 shrink-0"
                >
                  <div className="glass flex aspect-square items-center justify-center rounded-2xl">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                  <div className="mt-2 truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.trackKeys.length} tracks</div>
                </Link>
              ))}
            </HScroll>
          </Section>
        )}

        <Section title="Trending now">
          {trending.isLoading ? (
            <HScroll>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-40 shrink-0">
                  <div className="skeleton aspect-square rounded-2xl" />
                  <div className="skeleton mt-2 h-3 w-24 rounded" />
                </div>
              ))}
            </HScroll>
          ) : (
            <HScroll>
              {(trending.data ?? []).map((t) => (
                <TrackCard key={trackKey(t)} track={t} list={trending.data ?? []} />
              ))}
            </HScroll>
          )}
        </Section>

        {favorites.length > 0 && (
          <Section title="Favorite songs">
            <div className="space-y-1">
              {favorites
                .slice(0, 5)
                .map((k) => tracksById[k])
                .filter(Boolean)
                .map((t, i) => (
                  <TrackRow key={trackKey(t)} track={t} index={i} />
                ))}
            </div>
          </Section>
        )}
      </div>
    </AppShell>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">{children}</div>
  );
}

function TrackCard({ track, list }: { track: Track; list: Track[] }) {
  const playTrack = usePlayer((s) => s.playTrack);
  return (
    <button
      onClick={() => playTrack(track, list)}
      className="group w-40 shrink-0 text-left"
    >
      <div className="relative overflow-hidden rounded-2xl">
        <Artwork track={track} size={300} className="aspect-square" rounded="rounded-2xl" />
        <div className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-xl transition group-hover:opacity-100">
          <Play className="size-5 pl-0.5" />
        </div>
      </div>
      <div className="mt-2 truncate text-sm font-medium">{track.name}</div>
      <div className="truncate text-xs text-muted-foreground">{track.artist.join(", ")}</div>
    </button>
  );
}
