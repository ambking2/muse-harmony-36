import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { searchSmart } from "@/lib/gdmusic";
import { normalizeFa } from "@/lib/text";
import { isIranianTrack, matchesEntity } from "@/lib/search";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { Heart, Play, Shuffle, Disc3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/artist/$name")({ component: ArtistPage });

function ArtistPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const needle = normalizeFa(decoded);
  const favoriteArtists = useLibrary((s) => s.favoriteArtists);
  const toggleFavArtist = useLibrary((s) => s.toggleFavoriteArtist);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  // searchSmart translates the Persian name to the Latin form providers index,
  // then ranks; we keep only rows that actually credit this artist.
  const query = useQuery({
    queryKey: ["artist", decoded],
    queryFn: () => searchSmart(decoded, { count: 50 }),
    staleTime: 10 * 60_000,
  });

  const isLoading = query.isLoading;

  const list = useMemo(() => {
    const seen = new Set<string>();
    const out: Track[] = [];
    for (const t of query.data ?? []) {
      const k = trackKey(t);
      if (seen.has(k)) continue;
      seen.add(k);
      // Cross-script: a Persian artist name has to match a romanised credit.
      if (t.artist.some((a) => matchesEntity(a, decoded))) out.push(t);
    }
    return out;
  }, [query.data, decoded]);

  const albums = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of list) if (t.album && !m.has(t.album)) m.set(t.album, t);
    return [...m.entries()].slice(0, 8);
  }, [list]);

  const hero = list[0];
  const isFav = favoriteArtists.some((a) => matchesEntity(a, decoded));
  const iranian = list.filter(isIranianTrack).length;

  return (
    <AppShell>
      <div className="space-y-6">
        {hero && (
          <div className="relative -mx-4 -mt-4 h-64 overflow-hidden sm:-mx-6">
            <Artwork track={hero} size={800} className="size-full" rounded="rounded-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-6">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">خواننده</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{decoded}</h1>
            </div>
          </div>
        )}
        {!hero && <PageHeader eyebrow="خواننده" title={decoded} />}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => list.length && playQueue(list, 0)}
            disabled={!list.length}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 disabled:opacity-40"
          >
            <Play className="size-4" /> پخش
          </button>
          <button
            onClick={() => {
              playQueue(list, 0);
              toggleShuffle();
            }}
            disabled={!list.length}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition active:scale-95 disabled:opacity-40"
          >
            <Shuffle className="size-4" /> تصادفی
          </button>
          <button
            onClick={() => toggleFavArtist(decoded)}
            aria-pressed={isFav}
            className={cn(
              "glass flex size-11 items-center justify-center rounded-full transition active:scale-90",
              isFav && "text-primary",
            )}
            aria-label="خواننده‌ی محبوب"
          >
            <Heart className={cn("size-5", isFav && "fill-current")} />
          </button>
          {list.length > 0 && (
            <p className="ms-auto text-sm text-muted-foreground ltr-nums">
              {list.length.toLocaleString("fa-IR")} آهنگ
              {iranian > 0 && (
                <>
                  {" · "}
                  <span className="text-primary ltr-nums">
                    {iranian.toLocaleString("fa-IR")}
                  </span>{" "}
                  ایرانی
                </>
              )}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && albums.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Disc3 className="size-4 text-primary" /> آلبوم‌ها
            </h2>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {albums.map(([albumName, track]) => (
                <Link
                  key={albumName}
                  to="/album/$name"
                  params={{ name: albumName }}
                  className="w-40 shrink-0"
                >
                  <Artwork
                    track={track}
                    size={300}
                    className="aspect-square"
                    rounded="rounded-2xl"
                  />
                  <div className="mt-2 truncate text-sm font-medium">{albumName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {track.artist.join("، ")}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!isLoading && list.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            <p className="text-sm">برای این خواننده آهنگی پیدا نشد.</p>
            <Link to="/explore" className="mt-2 inline-block text-sm text-primary underline">
              جستجوی دیگر
            </Link>
          </div>
        )}

        {list.length > 0 && (
          <div className="space-y-1">
            {list.map((t, i) => (
              <TrackRow key={trackKey(t)} track={t} list={list} index={i} showIndex />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
