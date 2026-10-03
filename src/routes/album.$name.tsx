import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
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
      <Screen title={decoded} back={{ to: "/explore" }} largeTitle={false}>
        <div className="space-y-6 pt-2">
          {hero ? (
            <header className="flex flex-col items-start gap-5 sm:flex-row">
              <Artwork
                track={hero}
                size={500}
                className="aspect-square w-full max-w-xs"
                rounded="rounded-card"
              />
              <div className="flex-1 space-y-2">
                <p className="type-footnote text-ios-label-secondary">آلبوم</p>
                <h1 className="type-title-1">{decoded}</h1>
                {hero.artist[0] && (
                  <Link
                    to="/artist/$name"
                    params={{ name: hero.artist[0] }}
                    className="type-subheadline block text-ios-tint"
                  >
                    {hero.artist.join("، ")}
                  </Link>
                )}
                <p className="type-footnote text-ios-label-secondary ltr-nums">
                  {tracks.length.toLocaleString("fa-IR")} آهنگ
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => tracks.length && playQueue(tracks, 0)}
                    disabled={!tracks.length}
                    className="btn btn-filled"
                  >
                    <Play className="size-4 fill-current" strokeWidth={0} />
                    پخش
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playQueue(tracks, 0);
                      toggleShuffle();
                    }}
                    disabled={!tracks.length}
                    className="btn btn-gray"
                  >
                    <Shuffle className="size-4" strokeWidth={2} />
                    تصادفی
                  </button>
                </div>
              </div>
            </header>
          ) : null}

          {isFuzzy && (
            <div className="panel flex items-start gap-2 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-ios-orange" />
              <p className="type-footnote text-ios-label-secondary">
                آلبومی با این نام پیدا نشد؛ نتایج زیر از جستجوی نزدیک‌ترین عنوان‌هاست.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-ios-label-secondary" />
            </div>
          )}

          {!isLoading && tracks.length === 0 && (
            <EmptyState
              icon={Disc3}
              title="آهنگی برای این آلبوم پیدا نشد"
              description="شاید نام دیگری را امتحان کنید."
              action={
                <Link to="/explore" className="btn btn-filled">
                  جستجوی دیگر
                </Link>
              }
            />
          )}

          {tracks.length > 0 && (
            <Section title={`${tracks.length.toLocaleString("fa-IR")} آهنگ`}>
              {tracks.map((t, i) => (
                <TrackRow key={trackKey(t)} track={t} list={tracks} index={i} showIndex />
              ))}
            </Section>
          )}
        </div>
      </Screen>
    </AppShell>
  );
}
