import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import {
  formatTime,
  getLyric,
  getPicUrl,
  hasRealLyrics,
  isSameSong,
  lyricLookupQueries,
  picKey,
  searchTracks,
  QUALITIES,
} from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import type { LyricLine, Quality } from "@/lib/types";
import {
  ChevronDown,
  Disc3,
  Ellipsis,
  Heart,
  ListMusic,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Timer,
  Download,
  Music,
  Type,
  WifiOff,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { downloadTrack } from "@/lib/download";
import { queueRegistry } from "@/lib/ui-control";
import { shareTrack } from "@/lib/share-link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrackMenu } from "@/components/music/TrackMenu";
import { floatUp, iconPop } from "@/lib/design/motion-gsap";

export const Route = createFileRoute("/now-playing")({
  head: () => ({ meta: [{ title: "در حال پخش — muis" }] }),
  component: NowPlaying,
});

function NowPlaying() {
  const router = useRouter();
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isBuffering = usePlayer((s) => s.isBuffering);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const repeat = usePlayer((s) => s.repeat);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const quality = usePlayer((s) => s.quality);
  const setQuality = usePlayer((s) => s.setQuality);

  const favorites = useLibrary((s) => s.favorites);
  const toggleFav = useLibrary((s) => s.toggleFavorite);
  const downloads = useLibrary((s) => s.downloads);
  const key = track ? trackKey(track) : "";
  const isFav = favorites.includes(key);
  const isOffline = !!track?.srcUrl;
  const downloaded = downloads.some((d) => d.id.startsWith(`${key}:`) && d.status === "done");

  // The screen carries two controls and nothing else: collapse to wherever the
  // user came from (the mini player takes over), and the sheet for everything
  // secondary.
  const [menuOpen, setMenuOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const minimize = () => {
    if (window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/" });
  };

  const pic = useQuery({
    queryKey: picKey(track?.source ?? "", track?.pic_id ?? "", 800),
    enabled: !!track && !track.picUrl,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 800),
  });

  const lyrics = useQuery({
    queryKey: ["lyric", key],
    enabled: !!track,
    staleTime: 60 * 60_000,
    queryFn: () => getLyric(track!.source, track!.lyric_id),
  });

  /**
   * Joox never returns a lyric sheet — measured 0/8 against NetEase's 8/8 for
   * the same songs — while both providers list the same track. So when the
   * track's own provider comes back empty, look the title up on NetEase and
   * take the first hit that actually has words. Costs one extra search, and
   * only for the tracks that would otherwise show nothing at all.
   */
  const needsFallback = !!track && !lyrics.isLoading && !hasRealLyrics(lyrics.data?.lines ?? []);
  const fallback = useQuery({
    queryKey: ["lyric-fallback", key],
    enabled: needsFallback,
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: async () => {
      const blank = { lines: [], romanized: [], translated: [] };
      for (const q of lyricLookupQueries(track!)) {
        const hits = await searchTracks(q, { source: "netease", count: 5 });
        for (const hit of hits) {
          if (!isSameSong(track!, hit)) continue;
          const found = await getLyric("netease", hit.lyric_id);
          // A sheet of nothing but credits is not a rescue — keep looking.
          if (found.lines.length >= 3) return found;
        }
      }
      return blank;
    },
  });

  const shown = hasRealLyrics(lyrics.data?.lines ?? [])
    ? lyrics.data
    : (fallback.data ?? lyrics.data);

  const [showTranslation, setShowTranslation] = useState(true);
  const hasTranslation = (shown?.translated.length ?? 0) > 0;

  if (!track) {
    return (
      <AppShell>
        <EmptyState
          icon={Music}
          title="در حال حاضر چیزی پخش نمی‌شود"
          description="یک آهنگ از جستجو یا کتابخانه انتخاب کنید تا اینجا پخش شود."
          className="py-24"
          action={
            <button
              type="button"
              onClick={() => router.navigate({ to: "/explore" })}
              className="btn btn-filled"
            >
              رفتن به جستجو
            </button>
          }
        />
      </AppShell>
    );
  }

  const art = track.picUrl ?? pic.data;
  const remaining = Math.max(0, (duration || 0) - currentTime);

  // Rejects rather than resolving false: LoadingButton shows "کپی شد" only
  // after the action resolves, so a refused clipboard has to take the failure
  // path or the button would confirm a copy that never happened.
  const share = async () => {
    if (!(await shareTrack(track))) throw new Error("clipboard refused");
    toast.success("لینک کپی شد");
  };

  return (
    <AppShell>
      <div className="now-playing-screen relative h-[100dvh] min-h-0 overflow-hidden text-foreground">
        {/* Blurred background from the artwork, tinted by the extracted accent. */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          {art && (
            <img
              src={art}
              alt=""
              aria-hidden
              decoding="async"
              className="size-full object-cover opacity-50 blur-3xl saturate-150"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, color-mix(in oklch, var(--track-accent) 25%, transparent), var(--color-background) 70%)",
            }}
          />
        </div>

        <div className="now-playing-layout mx-auto flex h-full max-w-lg flex-col px-6 pb-[calc(var(--chrome-inset)+env(safe-area-inset-bottom)+0.5rem)] pt-[max(env(safe-area-inset-top),0.75rem)]">
          {/* Two independent controls: the song menu on the reading edge, the
              collapse chevron at the other end. */}
          <header className="flex items-center justify-between">
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="glass-btn press text-ios-label-secondary"
                  aria-label="امکانات آهنگ"
                >
                  <Ellipsis className="size-5" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={10}
                className="material-thick max-h-[70svh] w-72 origin-top overflow-y-auto rounded-2xl border-ios-separator p-2"
              >
                <div className="inset-divided">
                  <SheetRow
                    icon={<Type className="size-5" strokeWidth={2} />}
                    label="متن ترانه"
                    onClick={() => {
                      setMenuOpen(false);
                      setLyricsOpen(true);
                    }}
                  />
                  <SheetRow
                    icon={<ListMusic className="size-5" strokeWidth={2} />}
                    label="صف پخش"
                    onClick={() => {
                      setMenuOpen(false);
                      queueRegistry.openAll();
                    }}
                  />
                  {track.album && (
                    <SheetRow
                      icon={<Disc3 className="size-5" strokeWidth={2} />}
                      label={`آلبوم ${track.album}`}
                      to={`/album/$name`}
                      params={{ name: track.album }}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      if (!isFav) {
                        floatUp(event.currentTarget, "به علاقه‌مندی‌ها اضافه شد");
                        iconPop(event.currentTarget);
                      }
                      toggleFav(track);
                    }}
                    className="flex w-full items-center gap-3.5 px-2 py-3 text-start"
                  >
                    <SheetIcon>
                      <Heart className={cn("size-5", isFav && "fill-current")} strokeWidth={2} />
                    </SheetIcon>
                    <span className="flex-1 truncate text-sm font-medium">
                      {isFav ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                    </span>
                  </button>
                  <TrackMenu track={track}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3.5 px-2 py-3 text-start"
                    >
                      <SheetIcon>
                        <Plus className="size-5" strokeWidth={2} />
                      </SheetIcon>
                      <span className="flex-1 truncate text-sm font-medium">
                        افزودن به پلی‌لیست و بیشتر
                      </span>
                    </button>
                  </TrackMenu>
                  <div className="py-1.5">
                    <LoadingButton
                      variant="glass"
                      onAction={() => downloadTrack(track, quality)}
                      loadingText="در حال دانلود…"
                      successText="دانلود شد"
                      disabled={downloaded}
                      className="w-full justify-start gap-3.5 rounded-2xl px-3 py-3 text-start text-sm font-medium"
                    >
                      <SheetIcon>
                        {isOffline || downloaded ? (
                          <WifiOff className="size-5" strokeWidth={2} />
                        ) : (
                          <Download className="size-5" strokeWidth={2} />
                        )}
                      </SheetIcon>
                      {downloaded ? "دانلود شد — آفلاین گوش بدهید" : "دانلود برای پخش آفلاین"}
                    </LoadingButton>
                  </div>
                  <div className="py-1.5">
                    <LoadingButton
                      variant="glass"
                      onAction={share}
                      loadingText="در حال کپی…"
                      successText="کپی شد"
                      className="w-full justify-start gap-3.5 rounded-2xl px-3 py-3 text-start text-sm font-medium"
                    >
                      <SheetIcon>
                        <Share2 className="size-5" strokeWidth={2} />
                      </SheetIcon>
                      اشتراک‌گذاری آهنگ
                    </LoadingButton>
                  </div>
                </div>

                <div className="px-1 pt-1">
                  <p className="type-footnote mb-2 text-ios-label-secondary">کیفیت صدا</p>
                  <div className="glass grid grid-cols-4 gap-1.5 rounded-2xl p-1.5">
                    {QUALITIES.map((q) => (
                      <button
                        key={q.br}
                        onClick={() => onChangeQuality(setQuality, q.br as Quality)}
                        className={cn(
                          "rounded-xl py-2.5 text-xs font-semibold transition ltr-nums",
                          quality === q.br
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {q.br === 999 ? "FLAC" : q.br}
                      </button>
                    ))}
                  </div>
                </div>

                <SleepSection />
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={minimize}
              className="glass-btn press text-ios-label-secondary"
              aria-label="بستن صفحه پخش"
            >
              <ChevronDown className="size-5" strokeWidth={2.2} />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-0 overflow-hidden">
            {/* Cover */}
            <motion.div
              key={key}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              className="mx-auto w-full max-w-sm min-h-0 shrink"
            >
              <motion.div
                layoutId={`artwork-${key}`}
                className="relative aspect-square max-h-[min(42dvh,calc(100vw-3rem))] w-full overflow-hidden rounded-sheet shadow-2xl shadow-black/60"
              >
                {art ? (
                  <img
                    src={art}
                    alt={track.name}
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="skeleton size-full" />
                )}
                {isBuffering && (
                  <div className="absolute inset-0 grid place-items-center bg-black/30">
                    <Loader2 className="size-8 animate-spin" />
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Meta — the name and who sings it; the album lives in the menu. */}
            <div className="mt-3 shrink-0 text-center">
              <h1 className="type-title-2 truncate">{track.name}</h1>
              <div className="mt-0.5 flex flex-wrap justify-center gap-x-2">
                {track.artist.map((a) => (
                  <Link
                    key={a}
                    to="/artist/$name"
                    params={{ name: a }}
                    className="max-w-full truncate text-sm text-muted-foreground transition hover:text-primary"
                  >
                    {a}
                  </Link>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <Waveform current={currentTime} duration={duration} />
              <Slider
                value={[Math.min(currentTime, duration || 0)]}
                max={Math.max(duration || 0, 1)}
                step={0.5}
                onValueChange={(v) => seek(v[0])}
                className="mt-2"
                aria-label="موقعیت پخش"
              />
              <div className="type-footnote mt-1 flex justify-between tabular-nums text-ios-label-secondary ltr-nums">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(remaining)}</span>
              </div>
            </div>
          </div>

          {/* Transport — one row on every width, play at the centre and larger. */}
          <div className="mx-auto mt-3 flex w-full max-w-md shrink-0 flex-nowrap items-center justify-between">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              className={cn(
                "press grid size-11 shrink-0 place-items-center rounded-lg",
                shuffle ? "text-ios-tint" : "text-ios-label-secondary",
              )}
              aria-label="پخش تصادفی"
            >
              <Shuffle className="size-5" />
            </button>
            <button
              type="button"
              onClick={prev}
              className="press grid size-12 shrink-0 place-items-center rounded-lg text-ios-label"
              aria-label="قبلی"
            >
              <SkipBack className="size-8" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="press grid size-16 shrink-0 place-items-center rounded-full bg-ios-tint text-white shadow-xl shadow-black/30"
              aria-label={isPlaying ? "توقف" : "پخش"}
            >
              {isPlaying ? (
                <Pause className="size-7 fill-current" strokeWidth={0} />
              ) : (
                <Play className="size-7 translate-x-px fill-current" strokeWidth={0} />
              )}
            </button>
            <button
              type="button"
              onClick={next}
              className="press grid size-12 shrink-0 place-items-center rounded-lg text-ios-label"
              aria-label="بعدی"
            >
              <SkipForward className="size-8" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              className={cn(
                "press grid size-11 shrink-0 place-items-center rounded-lg",
                repeat !== "off" ? "text-ios-tint" : "text-ios-label-secondary",
              )}
              aria-label="تکرار"
            >
              {repeat === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Lyrics, in their own dialog so the main screen stays clear. */}
      <Dialog open={lyricsOpen} onOpenChange={setLyricsOpen}>
        <DialogContent className="material-thick max-h-[85svh] gap-3 overflow-y-auto rounded-sheet p-5">
          <DialogHeader>
            <DialogTitle className="type-title-3">متن ترانه</DialogTitle>
          </DialogHeader>
          {hasTranslation && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowTranslation((v) => !v)}
                aria-pressed={showTranslation}
                className={cn(
                  "glass rounded-full px-3.5 py-1.5 text-xs transition",
                  showTranslation ? "text-primary" : "text-muted-foreground",
                )}
              >
                {showTranslation ? "ترجمه روشن" : "ترجمه خاموش"}
              </button>
            </div>
          )}
          <Lyrics
            lines={shown?.lines ?? []}
            current={currentTime}
            loading={lyrics.isLoading || (needsFallback && fallback.isFetching)}
            showSecondLine={showTranslation && hasTranslation}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/** Keeps the picker's call sites honest without dragging types around. */
function onChangeQuality(set: (q: Quality) => void, br: Quality) {
  set(br);
}

function SheetIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ios-fill text-ios-tint">
      {children}
    </span>
  );
}

/**
 * One row of the song menu. Either a button (onClick) or a router link (to +
 * params); the two shapes never mix on one row.
 */
function SheetRow({
  icon,
  label,
  onClick,
  to,
  params,
  onNavigate,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  to?: string;
  params?: Record<string, string>;
  onNavigate?: () => void;
}) {
  const inner = (
    <>
      <SheetIcon>{icon}</SheetIcon>
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        params={params}
        onClick={onNavigate}
        className="flex w-full items-center gap-3.5 px-2 py-3 text-start transition hover:text-primary"
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 px-2 py-3 text-start"
    >
      {inner}
    </button>
  );
}

/** Static pseudo-random bars, scaled by playback progress. */
function Waveform({ current, duration }: { current: number; duration: number }) {
  const bars = useMemo(
    () => Array.from({ length: 64 }, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.7 + 3)) * 0.7),
    [],
  );
  const progress = duration > 0 ? current / duration : 0;
  return (
    <div className="flex h-10 items-end gap-[2px]" aria-hidden>
      {bars.map((h, i) => {
        // In RTL the progress fills from the right, so compare against the tail.
        const filled = (bars.length - 1 - i) / bars.length <= progress;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm transition-colors",
              filled ? "bg-ios-tint" : "bg-ios-label/20",
            )}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

function Lyrics({
  lines,
  current,
  loading,
  showSecondLine = false,
}: {
  lines: LyricLine[];
  current: number;
  loading: boolean;
  showSecondLine?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeIdx = useMemo(() => {
    if (!lines.length) return -1;
    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= current) idx = i;
      else break;
    }
    return idx;
  }, [lines, current]);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-lrc="${activeIdx}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx]);

  if (loading) return <div className="skeleton h-40 w-full rounded-card" />;
  if (!lines.length) {
    return (
      <div className="type-subheadline rounded-card border border-ios-separator bg-ios-surface/70 p-6 text-center text-ios-label-secondary backdrop-blur-2xl">
        متنی برای این آهنگ پیدا نشد.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="no-scrollbar max-h-[55svh] space-y-3 overflow-y-auto pb-6 pt-4 text-center"
    >
      {lines.map((l, i) => (
        <div key={`${i}-${l.time}`} data-lrc={i} className="px-2 transition-all">
          <p
            className={cn(
              "leading-relaxed",
              i === activeIdx ? "text-lg font-bold text-foreground" : "text-muted-foreground/60",
            )}
          >
            {l.text}
          </p>
          {showSecondLine && l.text2 && (
            <p
              className={cn(
                "mt-0.5 text-sm leading-relaxed",
                i === activeIdx ? "text-muted-foreground" : "text-muted-foreground/40",
              )}
            >
              {l.text2}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Sleep timer, inline in the song sheet — no drawer inside a drawer. */
function SleepSection() {
  const sleepAt = usePlayer((s) => s.sleepAt);
  const setSleep = usePlayer((s) => s.setSleepMinutes);
  const remaining = sleepAt ? Math.max(0, Math.ceil((sleepAt - Date.now()) / 60000)) : 0;
  return (
    <div className="px-5 py-4">
      <p className="type-footnote mb-2 flex items-center gap-1.5 text-ios-label-secondary">
        <Timer className="size-3.5" /> تایمر خواب
        {sleepAt && <span className="ltr-nums">· {remaining} دقیقه مانده</span>}
      </p>
      <div className="glass grid grid-cols-3 gap-1.5 rounded-2xl p-1.5">
        {[5, 10, 15, 30, 45, 60].map((m) => (
          <button
            key={m}
            onClick={() => {
              setSleep(m);
              toast.success(`تا ${m} دقیقه دیگر متوقف می‌شود`);
            }}
            className={cn(
              "rounded-xl py-2.5 text-sm font-semibold transition ltr-nums hover:bg-white/10",
              sleepAt && "opacity-80",
            )}
          >
            {m}
          </button>
        ))}
        {sleepAt && (
          <button
            onClick={() => setSleep(null)}
            className="col-span-3 rounded-xl py-2 text-sm text-destructive"
          >
            لغو تایمر
          </button>
        )}
      </div>
    </div>
  );
}
