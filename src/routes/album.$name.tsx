import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { searchSmart } from "@/lib/gdmusic";
import { matchesEntity } from "@/lib/search";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { Play, Shuffle, Disc3, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/album/$name")({ component: AlbumPage });

function AlbumPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  // The album name is translated to the Latin form providers index, so album
  // lookups work for Persian titles too.
  const query = useQuery({
    queryKey: ["album", decoded],
    queryFn: () => searchSmart(decoded, { count: 50 }),
    staleTime: 10 * 60_000,
  });
  const isLoading = query.isLoading;

  // Exact album matches only; the old fallback showed unrelated tracks under
  // the album's name, which was actively misleading.
  const { exact, fuzzy } = useMemo(() => {
    const seen = new Set<string>();
    const exact: Track[] = [];
    const fuzzy: Track[] = [];
    for (const t of query.data ?? []) {
      const k = trackKey(t);
      if (seen.has(k)) continue;
      seen.add(k);
      // Cross-script: a Persian album title has to match a romanised one.
      if (matchesEntity(t.album ?? "", decoded)) exact.push(t);
      else fuzzy.push(t);
    }
    return { exact, fuzzy };
  }, [query.data, decoded]);

  const tracks = exact.length ? exact : fuzzy;
  const hero = tracks[0];
  const isFuzzy = exact.length === 0 && fuzzy.length > 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {hero ? (
          <header className="flex flex-col items-start gap-6 sm:flex-row">
            <Artwork
              track={hero}
              size={500}
              className="aspect-square w-full max-w-xs"
              rounded="rounded-3xl"
            />
            <div className="flex-1 space-y-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">آلبوم</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{decoded}</h1>
              {hero.artist[0] && (
                <Link
                  to="/artist/$name"
                  params={{ name: hero.artist[0] }}
                  className="block text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {hero.artist.join("، ")}
                </Link>
              )}
              <p className="text-sm text-muted-foreground ltr-nums">
                {tracks.length.toLocaleString("fa-IR")} آهنگ
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => tracks.length && playQueue(tracks, 0)}
                  disabled={!tracks.length}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 disabled:opacity-40"
                >
                  <Play className="size-4" /> پخش
                </button>
                <button
                  onClick={() => {
                    playQueue(tracks, 0);
                    toggleShuffle();
                  }}
                  disabled={!tracks.length}
                  className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition active:scale-95 disabled:opacity-40"
                >
                  <Shuffle className="size-4" /> تصادفی
                </button>
              </div>
            </div>
          </header>
        ) : (
          <PageHeader eyebrow="آلبوم" title={decoded} />
        )}

        {isFuzzy && (
          <div className="glass flex items-start gap-2 rounded-2xl p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>آلبومی با این نام پیدا نشد؛ نتایج زیر از جستجوی نزدیک‌ترین عنوان‌هاست.</p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && tracks.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            <Disc3 className="mx-auto size-8" />
            <p className="mt-3 text-sm">آهنگی برای این آلبوم پیدا نشد.</p>
            <Link to="/explore" className="mt-2 inline-block text-sm text-primary underline">
              جستجوی دیگر
            </Link>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="space-y-1">
            {tracks.map((t, i) => (
              <TrackRow key={trackKey(t)} track={t} list={tracks} index={i} showIndex />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
