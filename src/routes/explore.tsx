import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { getPicUrl, searchSmart, SOURCES } from "@/lib/gdmusic";
import { isIranianTrack } from "@/lib/search";
import { hasPersianScript } from "@/lib/text";
import type { MusicSource, Track } from "@/lib/types";
import { TrackRow } from "@/components/music/TrackRow";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import {
  Search,
  X,
  Clock,
  Loader2,
  Mic2,
  ListMusic,
  Flame,
  Sparkles,
  Play,
  Shuffle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  src: z.enum(["all", "netease", "kuwo", "joox"]).optional(),
  ir: z.enum(["0", "1"]).optional(),
});

export const Route = createFileRoute("/explore")({
  validateSearch: (s) => searchSchema.parse(s),
  component: Explore,
});

/** Seed content for the idle state — Iranian first, then a few global lanes. */
const LANES: { title: string; query: string; emoji: string }[] = [
  { title: "پاپ ایرانی", query: "پاپ ایرانی", emoji: "🎵" },
  { title: "سینمایی ایرانی", query: "موسیقی سینمایی ایرانی", emoji: "🎬" },
  { title: "رپ فارسی", query: "رپ فارسی", emoji: "🎤" },
  { title: "موسیقی بی‌کلام", query: "موسیقی بی کلام", emoji: "🎹" },
  { title: "ترانه‌های قدیمی", query: "ترانه های قدیمی", emoji: "📻" },
  { title: "دسته‌بندی ملایران", query: "علیرضا طلیسچی", emoji: "🌟" },
];

const QUICK = [
  "محسن یگانه",
  "بنیامین بهزاد",
  "گوگوش",
  "همایون شجری پور",
  "امیر تتلو",
  "علیرضا طلیسچی",
  "The Weeknd",
  "Taylor Swift",
];

function Explore() {
  const { q: initialQ, src, ir } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [query, setQuery] = useState(initialQ ?? "");
  const [debounced, setDebounced] = useState(initialQ ?? "");

  const searchHistory = useLibrary((s) => s.searchHistory);
  const pushSearch = useLibrary((s) => s.pushSearch);
  const clearSearchHistory = useLibrary((s) => s.clearSearchHistory);

  const source: "all" | MusicSource = src ?? "all";
  const iranianFirst = ir !== "0";

  const setSource = (next: "all" | MusicSource) =>
    navigate({
      search: (p) => ({ ...p, src: next === "all" ? undefined : next }),
      replace: true,
    });
  const setIranian = (next: boolean) =>
    navigate({
      search: (p) => ({ ...p, ir: next ? undefined : ("0" as const) }),
      replace: true,
    });

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 320);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) return;
    pushSearch(debounced);
    navigate({ search: (p) => ({ ...p, q: debounced }), replace: true });
  }, [debounced, navigate, pushSearch]);

  // "/" focuses the search box from anywhere, like every other music app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const infinite = useInfiniteQuery({
    queryKey: ["explore", debounced, source, iranianFirst],
    enabled: !!debounced.trim(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchSmart(debounced, {
        count: 24,
        page: pageParam,
        iranianFirst,
        sources: source === "all" ? undefined : [source],
      }),
    getNextPageParam: (last, all) => (last.length >= 12 ? all.length + 1 : undefined),
    staleTime: 5 * 60_000,
  });

  const items = useMemo(() => (infinite.data?.pages ?? []).flat(), [infinite.data]);
  const iranianCount = useMemo(() => items.filter(isIranianTrack).length, [items]);

  const sentinelRef = useRef<HTMLDivElement>(null);
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

  // Derive artist/album groupings for the "jump to" rail.
  const groups = useMemo(() => {
    const artists = new Map<string, Track>();
    const albums = new Map<string, Track>();
    for (const t of items) {
      for (const a of t.artist ?? []) if (a && !artists.has(a)) artists.set(a, t);
      if (t.album && !albums.has(t.album)) albums.set(t.album, t);
    }
    return {
      artists: [...artists.entries()].slice(0, 8),
      albums: [...albums.entries()].slice(0, 8),
    };
  }, [items]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader eyebrow="جستجو" title="کشف موسیقی" />

        <SearchBar
          inputRef={inputRef}
          query={query}
          setQuery={setQuery}
          isLoading={infinite.isLoading}
        />

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <SourceChip active={source === "all"} onClick={() => setSource("all")}>
            همه
          </SourceChip>
          {SOURCES.map((s) => (
            <SourceChip
              key={s.id}
              active={source === s.id}
              onClick={() => setSource(s.id)}
              sub={sourceLabel(s.id)}
            >
              {s.label}
            </SourceChip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-white/10" />
          <SourceChip
            active={iranianFirst}
            onClick={() => setIranian(!iranianFirst)}
            icon={Flame}
            title="اولویت به آثار ایرانی"
          >
            ایرانی‌ها اول
          </SourceChip>
        </div>

        {!debounced.trim() ? (
          <IdleState
            history={searchHistory}
            onPick={setQuery}
            onClearHistory={clearSearchHistory}
          />
        ) : (
          <>
            <ResultSummary
              query={debounced}
              count={items.length}
              iranianCount={iranianCount}
              iranianFirst={iranianFirst}
              onPlayAll={() => usePlayer.getState().playQueue(items, 0)}
              onShuffle={() => {
                usePlayer.getState().playQueue(items, 0);
                usePlayer.getState().toggleShuffle();
              }}
            />

            {infinite.isError && (
              <EmptyState
                title="جستجو انجام نشد"
                body="ارتباط با سرویس موسیقی برقرار نشد. چند لحظه بعد دوباره تلاش کنید."
                action={
                  <button
                    onClick={() => infinite.refetch()}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    تلاش دوباره
                  </button>
                }
              />
            )}

            {!infinite.isError && (groups.artists.length > 0 || groups.albums.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.artists.length > 0 && (
                  <EntityRail title="خواننده‌ها" icon={Mic2}>
                    {groups.artists.map(([name, track]) => (
                      <RailItem
                        key={name}
                        href={`/artist/${encodeURIComponent(name)}`}
                        title={name}
                        subtitle={`${items.filter((t) => t.artist.includes(name)).length} آهنگ`}
                        track={track}
                      />
                    ))}
                  </EntityRail>
                )}
                {groups.albums.length > 0 && (
                  <EntityRail title="آلبوم‌ها" icon={ListMusic}>
                    {groups.albums.map(([name, track]) => (
                      <RailItem
                        key={name}
                        href={`/album/${encodeURIComponent(name)}`}
                        title={name}
                        subtitle={track.artist.join("، ")}
                        track={track}
                      />
                    ))}
                  </EntityRail>
                )}
              </div>
            )}

            <section className="space-y-1">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">آهنگ‌ها</h3>
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
                <TrackRow key={`${t.source}:${t.id}-${i}`} track={t} list={items} index={i} />
              ))}
              {!infinite.isLoading && items.length === 0 && (
                <EmptyState
                  title="نتیجه‌ای پیدا نشد"
                  body="املای عبارت را بررسی کنید یا نام خواننده را جداگانه جستجو کنید."
                />
              )}
              <div ref={sentinelRef} className="flex justify-center py-6">
                {infinite.isFetchingNextPage && (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SearchBar({
  inputRef,
  query,
  setQuery,
  isLoading,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (v: string) => void;
  isLoading: boolean;
}) {
  const isFa = hasPersianScript(query);
  return (
    <div className="glass sticky top-16 z-20 flex items-center gap-2 rounded-2xl border border-white/10 p-2">
      {isLoading ? (
        <Loader2 className="ms-2 size-5 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Search className="ms-2 size-5 shrink-0 text-muted-foreground" />
      )}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="نام آهنگ، خواننده یا آلبوم…"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="flex-1 bg-transparent px-1 py-2.5 text-base outline-none placeholder:text-muted-foreground"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          aria-label="پاک کردن"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function sourceLabel(id: MusicSource) {
  return id === "netease" ? "نت‌ایس" : id === "kuwo" ? "کوئو" : "جواکس";
}

function SourceChip({
  active,
  onClick,
  children,
  sub,
  icon: Icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sub?: string;
  icon?: typeof Flame;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition",
        active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "glass text-muted-foreground hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
      {sub && <span className="text-[10px] opacity-60 ltr-nums">{sub}</span>}
    </button>
  );
}

function ResultSummary({
  query,
  count,
  iranianCount,
  iranianFirst,
  onPlayAll,
  onShuffle,
}: {
  query: string;
  count: number;
  iranianCount: number;
  iranianFirst: boolean;
  onPlayAll: () => void;
  onShuffle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground ltr-nums">
          {count.toLocaleString("fa-IR")}
        </span>{" "}
        نتیجه برای «{query}»
        {iranianFirst && iranianCount > 0 && (
          <>
            {" · "}
            <span className="text-primary ltr-nums">
              {iranianCount.toLocaleString("fa-IR")}
            </span>{" "}
            اثر ایرانی
          </>
        )}
      </p>
      {count > 0 && (
        <div className="flex gap-2">
          <button
            onClick={onPlayAll}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
          >
            <Play className="size-4" /> پخش همه
          </button>
          <button
            onClick={onShuffle}
            className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm"
          >
            <Shuffle className="size-4" /> تصادفی
          </button>
        </div>
      )}
    </div>
  );
}

function EntityRail({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Mic2;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </h3>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}

function RailItem({
  href,
  title,
  subtitle,
  track,
}: {
  href: string;
  title: string;
  subtitle: string;
  track: Track;
}) {
  return (
    <Link
      to={href}
      className="glass flex w-40 shrink-0 items-center gap-3 rounded-2xl p-2 transition hover:bg-white/10"
    >
      <TrackThumb track={track} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  );
}

function TrackThumb({
  track,
  className = "size-11 rounded-xl",
}: {
  track: Track;
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["pic", track.source, track.pic_id, "150"],
    enabled: !!track.pic_id,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track.source, track.pic_id, 150),
  });
  return data ? (
    <img src={data} alt="" className={cn("shrink-0 object-cover", className)} />
  ) : (
    <div className={cn("skeleton shrink-0", className)} />
  );
}

function IdleState({
  history,
  onPick,
  onClearHistory,
}: {
  history: string[];
  onPick: (q: string) => void;
  onClearHistory: () => void;
}) {
  return (
    <div className="space-y-8">
      {history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">جستجوهای اخیر</h2>
            <button
              onClick={onClearHistory}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              پاک کردن
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h}
                onClick={() => onPick(h)}
                className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition hover:bg-white/10"
              >
                <Clock className="size-3.5 text-muted-foreground" /> {h}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Sparkles className="size-3.5" /> جستجوهای محبوب
        </h3>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((p) => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className="glass rounded-full px-3 py-1.5 text-sm transition hover:bg-white/10"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <Lanes onPick={onPick} />
    </div>
  );
}

function Lanes({ onPick }: { onPick: (q: string) => void }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <TrendingUp className="size-3.5" /> حالا این‌ها را گوش کنید
      </h3>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {LANES.map((lane) => (
          <LaneCard key={lane.title} {...lane} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}

function LaneCard({
  title,
  query,
  emoji,
  onPick,
}: {
  title: string;
  query: string;
  emoji: string;
  onPick: (q: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["lane", query],
    staleTime: 30 * 60_000,
    queryFn: () => searchSmart(query, { count: 6 }),
  });
  const first = data?.[0];
  return (
    <button
      onClick={() => onPick(query)}
      className="glass group relative w-44 shrink-0 overflow-hidden rounded-2xl p-3 text-right transition hover:bg-white/10"
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {first ? (
          <TrackThumb track={first} className="size-full rounded-none" />
        ) : (
          <div className="skeleton size-full" />
        )}
        <span className="absolute bottom-2 right-2 text-2xl drop-shadow">{emoji}</span>
      </div>
      <div className="truncate text-sm font-semibold">{title}</div>
      <div className="truncate text-[11px] text-muted-foreground">
        {data?.length ? `${data.length} آهنگ` : "در حال بارگذاری…"}
      </div>
    </button>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <Search className="mx-auto size-8 text-muted-foreground" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
