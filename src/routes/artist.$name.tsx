import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { searchSmart } from "@/lib/gdmusic";
import { normalizeFa } from "@/lib/text";
import { isIranianTrack, matchesEntity } from "@/lib/search";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { Heart, Play, Shuffle, Disc3, Loader2, Mic2 } from "lucide-react";
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
      <Screen title={decoded} back={{ to: "/explore" }} largeTitle={false}>
        <div className="space-y-6 pt-2">
          {hero && (
            <div className="relative -mx-4 h-64 overflow-hidden sm:-mx-6">
              <Artwork track={hero} size={800} className="size-full" rounded="rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-6">
                <p className="type-footnote text-ios-label-secondary">خواننده</p>
                <h1 className="type-title-1 mt-1">{decoded}</h1>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => list.length && playQueue(list, 0)}
              disabled={!list.length}
              className="btn btn-filled"
            >
              <Play className="size-4 fill-current" strokeWidth={0} />
              پخش
            </button>
            <button
              type="button"
              onClick={() => {
                playQueue(list, 0);
                toggleShuffle();
              }}
              disabled={!list.length}
              className="btn btn-gray"
            >
              <Shuffle className="size-4" strokeWidth={2} />
              تصادفی
            </button>
            <button
              type="button"
              onClick={() => toggleFavArtist(decoded)}
              aria-pressed={isFav}
              aria-label="خواننده‌ی محبوب"
              className={cn(
                "press grid size-11 place-items-center rounded-lg bg-ios-fill text-ios-label-secondary",
                isFav && "text-ios-pink",
              )}
            >
              <Heart className={cn("size-5", isFav && "fill-current")} strokeWidth={1.8} />
            </button>
            {list.length > 0 && (
              <p className="type-footnote ms-auto text-ios-label-secondary ltr-nums">
                {list.length.toLocaleString("fa-IR")} آهنگ
                {iranian > 0 && (
                  <>
                    {" · "}
                    <span className="ltr-nums text-ios-tint">
                      {iranian.toLocaleString("fa-IR")}
                    </span>
                    {" ایرانی"}
                  </>
                )}
              </p>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-ios-label-secondary" />
            </div>
          )}

          {!isLoading && albums.length > 0 && (
            <section>
              <h2 className="type-footnote mb-3 px-4 text-ios-label-secondary">آلبوم‌ها</h2>
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
                      rounded="media-tile"
                    />
                    <div className="type-subheadline mt-2 truncate">{albumName}</div>
                    <div className="type-footnote truncate text-ios-label-secondary">
                      {track.artist.join("، ")}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!isLoading && list.length === 0 && (
            <EmptyState
              icon={Mic2}
              title="برای این خواننده آهنگی پیدا نشد"
              description="شاید املای نام یا نام لاتین را امتحان کنید."
              action={
                <Link to="/explore" className="btn btn-filled">
                  جستجوی دیگر
                </Link>
              }
            />
          )}

          {list.length > 0 && (
            <Section title={`${list.length.toLocaleString("fa-IR")} آهنگ`}>
              {list.map((t, i) => (
                <TrackRow key={trackKey(t)} track={t} list={list} index={i} showIndex />
              ))}
            </Section>
          )}
        </div>
      </Screen>
    </AppShell>
  );
}
