import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Play,
  ArrowUpRight,
  Search,
  Headphones,
  Music2,
  Heart,
  ListMusic,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { searchTracksAll } from "@/lib/gdmusic";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey, type Track } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

const MOODS = [
  { label: "Unwind", query: "chill vibes" },
  { label: "Focus", query: "lofi beats" },
  { label: "Move", query: "workout" },
  { label: "Feel good", query: "feel good pop" },
  { label: "After hours", query: "late night jazz" },
];

function Home() {
  const library = useLibrary((s) => s.library);
  const history = useLibrary((s) => s.history);
  const tracksById = useLibrary((s) => s.tracksById);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const playQueue = usePlayer((s) => s.playQueue);
  const discoveries = useQuery({
    queryKey: ["home-discoveries", "popular music"],
    queryFn: async () =>
      (await searchTracksAll("popular music", { count: 12 })).slice(0, 12),
    staleTime: 10 * 60_000,
  });
  const discoveryTracks = discoveries.data ?? [];
  const recent = history
    .slice(0, 10)
    .map((entry) => tracksById[entry.key])
    .filter((track): track is Track => !!track);
  const favoriteTracks = favorites
    .map((key) => tracksById[key])
    .filter((track): track is Track => !!track);
  const featuredList = recent.length ? recent : discoveryTracks;
  const featured = featuredList[0];

  return (
    <AppShell>
      <div className="space-y-9 sm:space-y-11">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">A little more you</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Listen now<span className="text-primary">.</span>
            </h1>
          </div>
          <Link to="/explore" aria-label="Search music" className="glass icon-button">
            <Search aria-hidden="true" className="size-5" />
          </Link>
        </header>

        <section
          aria-label="Featured listening"
          className="hero-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-9"
        >
          <div className="grid items-center gap-8 sm:grid-cols-[1.15fr_1fr]">
            <div className="relative z-10">
              <p className="eyebrow mb-4 flex items-center gap-2 text-primary">
                <Headphones aria-hidden="true" className="size-4" />
                {recent.length ? "Back to your favorites" : "Find your next favorite"}
              </p>
              <h2 className="max-w-sm text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                Your world.<br />
                <span className="text-muted-foreground">On repeat.</span>
              </h2>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {recent.length
                  ? "Pick up where the good music left off."
                  : "A fresh sound for whatever the day feels like."}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {featured ? (
                  <button
                    type="button"
                    onClick={() => playQueue(featuredList)}
                    className="flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
                  >
                    <Play aria-hidden="true" className="size-4 fill-current" />
                    {recent.length ? "Play again" : "Start listening"}
                  </button>
                ) : (
                  <Link
                    to="/explore"
                    className="flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
                  >
                    Discover music <ArrowUpRight className="size-4" />
                  </Link>
                )}
                <Link
                  to="/library"
                  className="flex min-h-12 items-center gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Your collection <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-[20rem]">
              {featured ? (
                <>
                  <Artwork
                    track={featured}
                    size={500}
                    rounded="rounded-[1.75rem]"
                    className="artwork-shadow aspect-square"
                  />
                  <div className="glass-strong absolute -inset-x-3 bottom-4 rounded-2xl px-4 py-3">
                    <p className="truncate text-sm font-semibold">{featured.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {featured.artist.join(", ")}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-primary/20 to-secondary">
                  <Music2 aria-hidden="true" className="size-24 text-primary/70" strokeWidth={1} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section aria-label="Browse by mood" className="space-y-3">
          <p className="eyebrow text-muted-foreground">Set the mood</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {MOODS.map((mood) => (
              <Link
                key={mood.query}
                to="/explore"
                search={{ q: mood.query }}
                className="glass flex min-h-11 shrink-0 items-center rounded-full px-5 text-sm font-medium transition-colors hover:text-primary"
              >
                {mood.label}
              </Link>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <Section title="Back in rotation" subtitle="The tracks you keep coming back to">
            <HScroll>
              {recent.slice(0, 6).map((track) => (
                <TrackCard key={trackKey(track)} track={track} list={recent} />
              ))}
            </HScroll>
          </Section>
        )}

        <Section
          title="Something new"
          subtitle="Explore songs from the connected music sources"
          action={
            <Link to="/explore" className="flex min-h-11 items-center gap-1 text-xs font-medium text-primary">
              Explore <ArrowUpRight className="size-4" />
            </Link>
          }
        >
          {discoveries.isPending ? (
            <HScroll>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="w-40 shrink-0 sm:w-44">
                  <div className="skeleton aspect-square rounded-2xl" />
                  <div className="skeleton mt-3 h-3 w-28 rounded" />
                </div>
              ))}
            </HScroll>
          ) : discoveries.isError || !discoveryTracks.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <p className="text-sm font-medium">No discoveries available right now</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The music sources may be unavailable or have no results. Your collection is still here.
              </p>
              <button
                type="button"
                disabled={discoveries.isFetching}
                onClick={() => void discoveries.refetch()}
                className="mt-4 flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm"
              >
                <RefreshCw className="size-4" />
                {discoveries.isFetching ? "Trying…" : "Try again"}
              </button>
            </div>
          ) : (
            <HScroll>
              {discoveryTracks.map((track) => (
                <TrackCard key={trackKey(track)} track={track} list={discoveryTracks} />
              ))}
            </HScroll>
          )}
        </Section>

        <div className="grid gap-8 xl:grid-cols-2">
          <Section
            title="Your collection"
            subtitle={`${library.length} saved tracks`}
            action={library.length ? (
              <button type="button" onClick={() => playQueue(library)} className="icon-button text-primary" aria-label="Play saved tracks">
                <Play className="size-5" />
              </button>
            ) : undefined}
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-2">
              {library.length ? library.slice(0, 5).map((track, index) => (
                <TrackRow key={trackKey(track)} track={track} index={index} list={library} />
              )) : (
                <EmptyCollection
                  icon={<Music2 className="size-6 text-primary" />}
                  title="Make room for your favorites"
                  text="Save a track from its menu to start your collection."
                  label="Find music"
                />
              )}
            </div>
          </Section>
          <Section
            title="Made of favorites"
            subtitle={`${favoriteTracks.length} tracks you love`}
            action={<Link to="/favorites" aria-label="View favorites" className="icon-button text-primary"><Heart className="size-5" /></Link>}
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-2">
              {favoriteTracks.length ? favoriteTracks.slice(0, 5).map((track, index) => (
                <TrackRow key={trackKey(track)} track={track} index={index} list={favoriteTracks} />
              )) : (
                <EmptyCollection
                  icon={<Heart className="size-6 text-primary" />}
                  title="Keep the ones you love"
                  text="Tap the heart on a song. Find it here whenever you need it."
                  label="Explore songs"
                />
              )}
            </div>
          </Section>
        </div>

        <Section
          title="Your playlists"
          subtitle="A place for every mood"
          action={<Link to="/library" className="flex min-h-11 items-center text-xs font-medium text-primary">Open library <ArrowUpRight className="ml-1 size-4" /></Link>}
        >
          {playlists.length ? (
            <HScroll>
              {playlists.map((playlist) => {
                const cover = playlist.trackKeys.map((key) => tracksById[key]).find(Boolean);
                return (
                  <Link key={playlist.id} to="/playlist/$id" params={{ id: playlist.id }} className="w-40 shrink-0 rounded-2xl sm:w-44">
                    {cover ? (
                      <Artwork track={cover} className="aspect-square" rounded="rounded-2xl" />
                    ) : (
                      <div className="hero-panel flex aspect-square items-center justify-center rounded-2xl"><ListMusic className="size-10 text-primary" /></div>
                    )}
                    <p className="mt-3 truncate text-sm font-semibold">{playlist.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{playlist.trackKeys.length} tracks</p>
                  </Link>
                );
              })}
            </HScroll>
          ) : (
            <div className="hero-panel flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
              <div>
                <p className="font-semibold">A soundtrack of your own</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first playlist in the library.</p>
              </div>
              <Link to="/library" className="glass flex min-h-11 items-center rounded-full px-5 text-sm">
                Create a playlist <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, subtitle, children, action }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function HScroll({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-1 flex snap-x snap-proximity gap-4 overflow-x-auto p-1 pb-3">{children}</div>;
}

function TrackCard({ track, list }: { track: Track; list: Track[] }) {
  const playTrack = usePlayer((s) => s.playTrack);
  return (
    <button
      type="button"
      aria-label={`Play ${track.name} by ${track.artist.join(", ")}`}
      onClick={() => playTrack(track, list)}
      className="group w-40 shrink-0 snap-start rounded-2xl text-left sm:w-44"
    >
      <div className="relative">
        <Artwork track={track} size={300} className="aspect-square transition-transform duration-300 group-hover:scale-[1.025]" rounded="rounded-2xl" />
        <span className="glass-strong absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full text-foreground"><Play aria-hidden="true" className="size-4 fill-current" /></span>
      </div>
      <p className="mt-3 truncate text-sm font-semibold">{track.name}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{track.artist.join(", ")}</p>
    </button>
  );
}

function EmptyCollection({ icon, title, text, label }: {
  icon: ReactNode;
  title: string;
  text: string;
  label: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-8 text-center">
      <span className="mb-4 rounded-2xl bg-primary/10 p-4">{icon}</span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">{text}</p>
      <Link to="/explore" className="mt-4 flex min-h-11 items-center text-sm text-primary">{label} <ArrowUpRight className="ml-1 size-4" /></Link>
    </div>
  );
}
