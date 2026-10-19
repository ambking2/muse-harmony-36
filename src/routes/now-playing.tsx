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
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { LoadingButton } from "@/components/ui/loading-button";
import { RippleButton } from "@/components/ui/ripple-button";
import { downloadTrack } from "@/lib/download";
import { queueRegistry } from "@/lib/ui-control";
import { shareTrack } from "@/lib/share-link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrackMenu } from "@/components/music/TrackMenu";
import { floatUp, iconPop, gsap } from "@/lib/design/motion-gsap";

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
  const discRef = useRef<HTMLDivElement>(null);

  // The listening booth's signature: the artwork is the record under the
  // needle. While the track plays the platter turns, slowly; pausing stops it
  // where it is rather than resetting it, and picking the same record up again
  // resumes from that exact groove. Reduce Motion keeps the image still.
  useEffect(() => {
    const disc = discRef.current;
    if (!disc || !isPlaying) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const spin = gsap.to(disc, {
      rotation: "+=360",
      duration: 24,
      ease: "none",
      repeat: -1,
    });
    return () => {
      spin.kill();
    };
  }, [isPlaying, key]);

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

  const [showLyrics, setShowLyrics] = useState(false);
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
    <div className="relative min-h-screen overflow-hidden text-foreground">
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

      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-44 pt-5">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="press grid size-11 place-items-center rounded-lg bg-ios-fill text-ios-label-secondary"
            aria-label="بازگشت"
          >
            <ChevronDown className="size-5 rotate-180" strokeWidth={2} />
          </button>
          <div className="text-center">
            <p className="type-footnote text-ios-label-secondary">در حال پخش</p>
            <p className="type-caption text-ios-label-tertiary">
              {isOffline ? "آفلاین" : isBuffering ? "در حال بافر…" : track.album || "muis"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => queueRegistry.openAll()}
            className="press grid size-11 place-items-center rounded-lg bg-ios-fill text-ios-label-secondary"
            aria-label="صف پخش"
          >
            <ListMusic className="size-5" strokeWidth={2} />
          </button>
        </header>

        {/* Cover */}
        <motion.div
          key={key}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="mx-auto mt-8 w-full max-w-sm"
        >
          <motion.div
            // Shared with the mini player: the same album is one object in two
            // places, so when both are on screen it travels between them rather
            // than being cut from one size to another.
            layoutId={`artwork-${key}`}
            ref={discRef}
            className="relative aspect-square overflow-hidden rounded-sheet shadow-2xl shadow-black/60"
          >
            {art ? (
              <img src={art} alt={track.name} decoding="async" className="size-full object-cover" />
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

        {/* Meta */}
        <div className="mt-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="type-title-2 truncate">{track.name}</h1>
            <div className="flex flex-wrap gap-x-2">
              {track.artist.map((a) => (
                <Link
                  key={a}
                  to="/artist/$name"
                  params={{ name: a }}
                  className="max-w-full truncate text-muted-foreground transition hover:text-primary"
                >
                  {a}
                </Link>
              ))}
            </div>
            {track.album && (
              <Link
                to="/album/$name"
                params={{ name: track.album }}
                className="mt-0.5 block truncate text-xs text-muted-foreground/70 transition hover:text-primary"
              >
                {track.album}
              </Link>
            )}
          </div>
          <button
            onClick={(event) => {
              if (!isFav) {
                floatUp(event.currentTarget, "به علاقه‌مندی‌ها اضافه شد");
                iconPop(event.currentTarget);
              }
              toggleFav(track);
            }}
            className={cn(
              "shrink-0 rounded-full p-2 transition active:scale-90",
              isFav ? "text-primary" : "text-muted-foreground",
            )}
            aria-label="علاقه‌مندی"
          >
            <Heart className={cn("size-6", isFav && "fill-current")} />
          </button>
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

        {/* Transport */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            className={cn(
              "press grid size-11 place-items-center rounded-lg",
              shuffle ? "text-ios-tint" : "text-ios-label-secondary",
            )}
            aria-label="پخش تصادفی"
          >
            <Shuffle className="size-5" />
          </button>
          <button
            type="button"
            onClick={prev}
            className="press grid size-12 place-items-center rounded-lg text-ios-label"
            aria-label="قبلی"
          >
            <SkipBack className="size-8" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="press grid size-16 place-items-center rounded-full bg-ios-tint text-white shadow-xl shadow-black/30"
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
            className="press grid size-12 place-items-center rounded-lg text-ios-label"
            aria-label="بعدی"
          >
            <SkipForward className="size-8" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            className={cn(
              "press grid size-11 place-items-center rounded-lg",
              repeat !== "off" ? "text-ios-tint" : "text-ios-label-secondary",
            )}
            aria-label="تکرار"
          >
            {repeat === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
          </button>
        </div>

        {/* Secondary actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setShowLyrics((v) => !v)}
            className={cn("btn btn-gray", showLyrics && "text-ios-tint")}
          >
            <Type className="size-4" strokeWidth={2} />{" "}
            {showLyrics ? "پنهان‌کردن متن" : "متن ترانه"}
          </button>
          <QualityMenu quality={quality} onChange={setQuality} />
          <LoadingButton
            variant="glass"
            onAction={() => downloadTrack(track, quality)}
            loadingText="در حال دانلود…"
            successText="دانلود شد"
            disabled={downloaded}
          >
            {isOffline || downloaded ? <WifiOff /> : <Download />}
            {/* `downloaded` is read back from storage, so the label has to say
                "done" for a file saved in a previous session too — not only
                inside LoadingButton's own success window. */}
            {downloaded ? "دانلود شد" : "دانلود"}
          </LoadingButton>
          <LoadingButton
            variant="glass"
            onAction={share}
            loadingText="در حال کپی…"
            successText="کپی شد"
          >
            <Share2 /> اشتراک
          </LoadingButton>
          <TrackMenu track={track}>
            <button type="button" className="btn btn-gray">
              <Plus className="size-4" strokeWidth={2} /> بیشتر
            </button>
          </TrackMenu>
          <SleepButton />
        </div>

        {showLyrics && (
          <div className="mt-6 flex-1">
            {hasTranslation && (
              <div className="mb-3 flex justify-center">
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
          </div>
        )}
      </div>
    </div>
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
      className="no-scrollbar max-h-80 space-y-3 overflow-y-auto pb-24 pt-8 text-center"
    >
      {" "}
      {lines.map((l, i) => (
        <div key={`${i}-${l.time}`} data-lrc={i} className="px-4 transition-all">
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

function QualityMenu({ quality, onChange }: { quality: Quality; onChange: (q: Quality) => void }) {
  return (
    <div className="glass flex overflow-hidden rounded-full">
      {QUALITIES.map((q) => (
        <button
          key={q.br}
          onClick={() => onChange(q.br as Quality)}
          className={cn(
            "px-3 py-2 text-xs font-medium transition ltr-nums",
            quality === q.br ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {q.br === 999 ? "FLAC" : q.br}
        </button>
      ))}
    </div>
  );
}

function SleepButton() {
  const sleepAt = usePlayer((s) => s.sleepAt);
  const setSleep = usePlayer((s) => s.setSleepMinutes);
  const [open, setOpen] = useState(false);
  const remaining = sleepAt ? Math.max(0, Math.ceil((sleepAt - Date.now()) / 60000)) : 0;
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm",
          sleepAt && "text-primary",
        )}
      >
        <Timer className="size-4" /> {sleepAt ? `${remaining} دقیقه` : "تایمر خواب"}
      </button>
      <DrawerContent className="bg-card/95 backdrop-blur-2xl">
        <DrawerTitle className="px-5 text-base">تایمر خواب</DrawerTitle>
        <div className="grid grid-cols-3 gap-3 p-4">
          {[5, 10, 15, 30, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => {
                setSleep(m);
                toast.success(`تا ${m} دقیقه دیگر متوقف می‌شود`);
                setOpen(false);
              }}
              className="glass rounded-2xl p-4 text-lg font-semibold transition hover:bg-white/10 ltr-nums"
            >
              {m}
            </button>
          ))}
          {sleepAt && (
            <button
              onClick={() => {
                setSleep(null);
                setOpen(false);
              }}
              className="col-span-3 rounded-full py-2 text-sm text-destructive"
            >
              لغو تایمر
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
