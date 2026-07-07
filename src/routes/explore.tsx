import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { SOURCES, searchTracks } from "@/lib/gdmusic";
import type { MusicSource, Track } from "@/lib/types";
import { trackKey } from "@/lib/types";
import { TrackRow } from "@/components/music/TrackRow";
import { useLibrary } from "@/stores/library";
import { Search, X, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  src: z.enum(["netease", "kuwo", "joox"]).optional(),
});

export const Route = createFileRoute("/explore")({
  validateSearch: (s) => searchSchema.parse(s),
  component: Explore,
});

function Explore() {
  const { q: initialQ, src: initialSrc } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [query, setQuery] = useState(initialQ ?? "");
  const [source, setSource] = useState<MusicSource>((initialSrc as MusicSource) ?? "netease");
  const [debounced, setDebounced] = useState(query);

  const searchHistory = useLibrary((s) => s.searchHistory);
  const pushSearch = useLibrary((s) => s.pushSearch);
  const clearSearchHistory = useLibrary((s) => s.clearSearchHistory);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) return;
    pushSearch(debounced);
    navigate({ search: { q: debounced, src: source }, replace: true });
  }, [debounced, source, navigate, pushSearch]);

  const infinite = useInfiniteQuery({
    queryKey: ["explore", debounced, source],
    enabled: !!debounced.trim(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => searchTracks(debounced, { source, count: 20, page: pageParam }),
    getNextPageParam: (last, all) => (last.length === 20 ? all.length + 1 : undefined),
    staleTime: 5 * 60_000,
  });

  const items = useMemo(
    () => (infinite.data?.pages ?? []).flat(),
    [infinite.data],
  );

  // sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && infinite.hasNextPage && !infinite.isFetchingNextPage) {
        infinite.fetchNextPage();
      }
    });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [infinite.hasNextPage, infinite.isFetchingNextPage, infinite.fetchNextPage]); // eslint-disable-line

  // Derive artist/album groupings
  const groups = useMemo(() => {
    const artists = new Map<string, Track>();
    const albums = new Map<string, Track>();
    for (const t of items) {
      for (const a of t.artist) if (!artists.has(a)) artists.set(a, t);
      if (t.album && !albums.has(t.album)) albums.set(t.album, t);
    }
    return { artists: [...artists.entries()].slice(0, 6), albums: [...albums.entries()].slice(0, 6) };
  }, [items]);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Explore</h1>

        <div className="glass sticky top-2 z-20 flex items-center gap-2 rounded-2xl border border-white/10 p-2">
          <Search className="ml-2 size-5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Songs, artists, albums…"
            className="flex-1 bg-transparent px-1 py-2 text-base outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="rounded-full p-2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={cn(
                "rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium transition",
                source === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {!debounced.trim() ? (
          <div className="space-y-6">
            {searchHistory.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">Recent searches</h2>
                  <button onClick={clearSearchHistory} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((h) => (
                    <button
                      key={h}
                      onClick={() => setQuery(h)}
                      className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
                    >
                      <Clock className="size-3.5 text-muted-foreground" /> {h}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <QuickPicks onPick={setQuery} />
          </div>
        ) : (
          <>
            {(groups.artists.length > 0 || groups.albums.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.artists.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Artists</h3>
                    <div className="space-y-1">
                      {groups.artists.map(([name]) => (
                        <Link
                          key={name}
                          to="/artist/$name"
                          params={{ name }}
                          className="block rounded-lg px-2 py-2 text-sm hover:bg-white/5"
                        >
                          {name}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
                {groups.albums.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Albums</h3>
                    <div className="space-y-1">
                      {groups.albums.map(([name]) => (
                        <Link
                          key={name}
                          to="/album/$name"
                          params={{ name }}
                          className="block rounded-lg px-2 py-2 text-sm hover:bg-white/5"
                        >
                          {name}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            <section className="space-y-1">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Songs</h3>
              {infinite.isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="skeleton size-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-2/3 rounded" />
                      <div className="skeleton h-2 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              {items.map((t, i) => (
                <TrackRow key={`${trackKey(t)}-${i}`} track={t} list={items} index={i} />
              ))}
              <div ref={sentinelRef} className="flex justify-center py-6">
                {infinite.isFetchingNextPage && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function QuickPicks({ onPick }: { onPick: (q: string) => void }) {
  const picks = ["The Weeknd", "Taylor Swift", "Drake", "Billie Eilish", "Coldplay", "Ed Sheeran", "Adele", "BTS"];
  const previews = useQuery({
    queryKey: ["quick-picks"],
    queryFn: () => searchTracks("chill", { count: 8 }),
    staleTime: 30 * 60_000,
  });
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Suggestions</h3>
        <div className="flex flex-wrap gap-2">
          {picks.map((p) => (
            <button key={p} onClick={() => onPick(p)} className="glass rounded-full px-3 py-1.5 text-sm">
              {p}
            </button>
          ))}
        </div>
      </section>
      {previews.data && previews.data.length > 0 && (
        <section className="space-y-1">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Fresh from gdmusic</h3>
          {previews.data.map((t, i) => (
            <TrackRow key={trackKey(t)} track={t} list={previews.data!} index={i} />
          ))}
        </section>
      )}
    </div>
  );
}