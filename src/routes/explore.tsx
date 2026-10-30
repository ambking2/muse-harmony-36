import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Loader2, Play, Search, Shuffle, WifiOff } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Screen } from "@/components/ios/Screen";
import { SearchField } from "@/components/ios/SearchField";
import { Section } from "@/components/ios/Section";
import { CollectionRail, EntityRail, LaneRail } from "@/components/search/Rails";
import { PlaylistDiscovery } from "@/components/search/PlaylistDiscovery";
import { RecognizeSearchCard } from "@/components/search/RecognizeSearchCard";
import { IdleScreen } from "@/components/search/IdleScreen";
import { TrackRow } from "@/components/music/TrackRow";
import { searchSmart } from "@/lib/gdmusic";
import { isIranianTrack } from "@/lib/search";
import { hasPersianScript } from "@/lib/text";
import { suggestAliases } from "@/lib/aliases";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/explore")({
  validateSearch: (s) => searchSchema.parse(s),
  component: Explore,
});

/** Seed content for the idle screen — Iranian first, then a few global lanes. */
const LANES = [
  { title: "پاپ ایرانی", query: "پاپ ایرانی", emoji: "🎵" },
  { title: "سینمایی ایرانی", query: "موسیقی سینمایی ایرانی", emoji: "🎬" },
  { title: "رپ فارسی", query: "رپ فارسی", emoji: "🎤" },
  { title: "موسیقی بی‌کلام", query: "موسیقی بی کلام", emoji: "🎹" },
  { title: "ترانه‌های قدیمی", query: "ترانه های قدیمی", emoji: "📻" },
  { title: "ملایران", query: "علیرضا طلیسچی", emoji: "🌟" },
] as const;

/**
 * Search.
 *
 * A search field that owns the page, an idle screen full of shortcuts, and
 * results as one list with the artists and albums found above it. The query
 * lives in the URL, so a result page can be linked to and the back gesture
 * returns to the same results.
 */
function Explore() {
  const { q: initialQ } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [query, setQuery] = useState(initialQ ?? "");
  const [debounced, setDebounced] = useState(initialQ ?? "");
  const playQueue = usePlayer((state) => state.playQueue);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const pushSearch = useLibrary((state) => state.pushSearch);

  // Persian type-ahead. Only shown when the typed text is Persian and the
  // user hasn't already landed on an exact alias, so it never nags.
  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!hasPersianScript(q)) return [];
    return suggestAliases(q).filter((alias) => alias.fa.trim() !== q);
  }, [query]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 320);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) return;
    pushSearch(debounced);
    navigate({ search: (previous) => ({ ...previous, q: debounced }), replace: true });
  }, [debounced, navigate, pushSearch]);

  // "/" focuses the search box from anywhere, like every other music app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useInfiniteQuery({
    queryKey: ["explore", debounced],
    enabled: !!debounced.trim(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => searchSmart(debounced, { count: 24, page: pageParam }),
    getNextPageParam: (last, all) => (last.length >= 12 ? all.length + 1 : undefined),
    staleTime: 5 * 60_000,
  });

  const items = useMemo(() => (results.data?.pages ?? []).flat(), [results.data]);
  const iranianCount = useMemo(() => items.filter(isIranianTrack).length, [items]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && results.hasNextPage && !results.isFetchingNextPage) {
        results.fetchNextPage();
      }
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [results.hasNextPage, results.isFetchingNextPage, results.fetchNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Artists and albums worth jumping to, derived once per result set rather
  // than on every render of the page.
  const groups = useMemo(() => {
    const artists = new Map<string, Track>();
    const albums = new Map<string, Track>();
    for (const track of items) {
      for (const artist of track.artist)
        if (artist && !artists.has(artist)) artists.set(artist, track);
      if (track.album && !albums.has(track.album)) albums.set(track.album, track);
    }
    return {
      artists: [...artists.entries()].slice(0, 8),
      albums: [...albums.entries()].slice(0, 8),
    };
  }, [items]);

  return (
    <AppShell>
      <Screen title="جستجو" subtitle="نام فارسی، لاتین یا بخشی از ترانه">
        {/* The field follows the user down the page. Results are long, and the
            one control worth having in the hand while reading them is the one
            that changes them — so it rides above the list on a frosted bar
            that lets rows pass under it, rather than scrolling away. */}
        <div className="sticky top-[calc(max(env(safe-area-inset-top),0.75rem)+3.75rem)] z-30 -mx-4 mt-4 px-4 py-2">
          <div className="mx-auto w-full max-w-xl">
            <SearchField
              value={query}
              onChange={setQuery}
              inputRef={inputRef}
              placeholder="نام آهنگ، خواننده یا آلبوم"
            />
          </div>
        </div>

        <RecognizeSearchCard />

        {!debounced.trim() ? (
          <div className="mt-6">
            <IdleScreen suggestions={suggestions.map((alias) => alias.fa)} onPick={setQuery} />
            <LaneRail lanes={LANES} onPick={setQuery} />
            <CollectionRail />
            <PlaylistDiscovery />
          </div>
        ) : (
          <div className="mt-6">
            {results.isError ? (
              <EmptyState
                icon={WifiOff}
                title="جستجو انجام نشد"
                description="ارتباط با سرویس موسیقی برقرار نشد. چند لحظه بعد دوباره تلاش کنید."
                action={
                  <button
                    type="button"
                    onClick={() => results.refetch()}
                    className="btn btn-filled"
                  >
                    تلاش دوباره
                  </button>
                }
              />
            ) : (
              <>
                <ResultSummary
                  query={debounced}
                  count={items.length}
                  iranianCount={iranianCount}
                  onPlayAll={() => playQueue(items, 0)}
                  onShuffle={() => {
                    playQueue(items, 0);
                    toggleShuffle();
                  }}
                />

                {groups.artists.length > 0 && (
                  <EntityRail title="خواننده‌ها" base="/artist" items={groups.artists} />
                )}
                {groups.albums.length > 0 && (
                  <EntityRail title="آلبوم‌ها" base="/album" items={groups.albums} />
                )}

                <Section title="آهنگ‌ها">
                  {results.isLoading &&
                    Array.from({ length: 8 }).map((_, index) => <TrackSkeleton key={index} />)}

                  {items.map((track, index) => (
                    <TrackRow
                      key={`${track.source}:${track.id}-${index}`}
                      track={track}
                      list={items}
                      index={index}
                    />
                  ))}

                  {!results.isLoading && items.length === 0 && (
                    <EmptyState
                      icon={Search}
                      title="نتیجه‌ای پیدا نشد"
                      description="املای عبارت را بررسی کنید یا نام خواننده را جداگانه جستجو کنید."
                    />
                  )}

                  <div ref={sentinelRef} className="grid h-14 place-items-center">
                    {results.isFetchingNextPage && (
                      <Loader2 className="size-5 animate-spin text-ios-label-secondary" />
                    )}
                  </div>
                </Section>
              </>
            )}
          </div>
        )}
      </Screen>
    </AppShell>
  );
}

/** A placeholder shaped like a real row, so the list does not jump when the
 *  results land. */
function TrackSkeleton() {
  return (
    <div className="panel flex min-h-14 items-center gap-3 px-3">
      <div className="skeleton size-12 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

/** How many results, how many of them Iranian, and the two controls that start
 *  playing them. */
function ResultSummary({
  query,
  count,
  iranianCount,
  onPlayAll,
  onShuffle,
}: {
  query: string;
  count: number;
  iranianCount: number;
  onPlayAll: () => void;
  onShuffle: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4">
      <p className="type-subheadline text-ios-label-secondary">
        <span className="font-semibold text-ios-label ltr-nums">
          {count.toLocaleString("fa-IR")}
        </span>{" "}
        نتیجه برای «{query}»
        {iranianCount > 0 && (
          <>
            {" · "}
            <span className="ltr-nums text-ios-tint">{iranianCount.toLocaleString("fa-IR")}</span>
            {" اثر ایرانی"}
          </>
        )}
      </p>
      {count > 0 && (
        <div className="flex gap-2">
          <button type="button" onClick={onPlayAll} className="btn btn-filled">
            <Play className="size-4 fill-current" strokeWidth={0} />
            پخش همه
          </button>
          <button
            type="button"
            onClick={onShuffle}
            className="btn btn-gray"
            aria-label="پخش تصادفی"
          >
            <Shuffle className="size-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
