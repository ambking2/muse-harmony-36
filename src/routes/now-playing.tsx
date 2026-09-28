import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { formatTime, getLyric, getPicUrl, QUALITIES } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import type { Quality } from "@/lib/types";
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
  Type,
  WifiOff,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { downloadTrack } from "@/lib/download";
import { queueRegistry } from "@/lib/ui-control";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrackMenu } from "@/components/music/TrackMenu";

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

  const pic = useQuery({
    queryKey: ["pic", key, "800"],
    enabled: !!track && !track!.picUrl,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 800),
  });

  const lyrics = useQuery({
    queryKey: ["lyric", key],
    enabled: !!track,
    staleTime: 60 * 60_000,
    queryFn: () => getLyric(track!.source, track!.lyric_id),
  });

  const [showLyrics, setShowLyrics] = useState(false);

  if (!track) {
    return (
      <AppShell>
        <div className="py-24 text-center">
          <p className="text-muted-foreground">در حال حاضر چیزی پخش نمی‌شود.</p>
          <button
            onClick={() => router.navigate({ to: "/explore" })}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            رفتن به جستجو
          </button>
        </div>
      </AppShell>
    );
  }

  const art = track.picUrl ?? pic.data;
  const remaining = Math.max(0, (duration || 0) - currentTime);

  const share = async () => {
    const url = `${window.location.origin}/explore?q=${encodeURIComponent(
      `${track.name} ${track.artist[0] ?? ""}`,
    )}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.name, text: track.artist.join("، "), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("لینک کپی شد");
      }
    } catch {
      // Share sheet dismissed.
    }
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
            onClick={() => router.history.back()}
            className="glass flex size-10 items-center justify-center rounded-full transition active:scale-95"
            aria-label="بازگشت"
          >
            <ChevronDown className="size-5 rotate-180" />
          </button>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              در حال پخش
            </p>
            <p className="text-xs text-muted-foreground/70">
              {isOffline ? "آفلاین" : isBuffering ? "در حال بافر…" : track.album || "muis"}
            </p>
          </div>
          <button
            onClick={() => queueRegistry.openAll()}
            className="glass flex size-10 items-center justify-center rounded-full transition active:scale-95"
            aria-label="صف پخش"
          >
            <ListMusic className="size-5" />
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
          <div className="relative aspect-square overflow-hidden rounded-3xl shadow-2xl shadow-black/60">
            {art ? (
              <img src={art} alt={track.name} className="size-full object-cover" />
            ) : (
              <div className="skeleton size-full" />
            )}
            {isBuffering && (
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <Loader2 className="size-8 animate-spin" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Meta */}
        <div className="mt-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{track.name}</h1>
            <p className="truncate text-muted-foreground">{track.artist.join("، ")}</p>
            {track.album && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{track.album}</p>
            )}
          </div>
          <button
            onClick={() => toggleFav(track)}
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
          <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground ltr-nums">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(remaining)}</span>
          </div>
        </div>

        {/* Transport */}
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            className={cn(
              "p-2 transition active:scale-90",
              shuffle ? "text-primary" : "text-muted-foreground",
            )}
            aria-label="پخش تصادفی"
          >
            <Shuffle className="size-5" />
          </button>
          <button
            onClick={prev}
            className="p-2 text-foreground transition active:scale-90"
            aria-label="قبلی"
          >
            <SkipBack className="size-8" />
          </button>
          <button
            onClick={togglePlay}
            className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transition active:scale-95"
            aria-label={isPlaying ? "توقف" : "پخش"}
          >
            {isPlaying ? <Pause className="size-7" /> : <Play className="size-7" />}
          </button>
          <button
            onClick={next}
            className="p-2 text-foreground transition active:scale-90"
            aria-label="بعدی"
          >
            <SkipForward className="size-8" />
          </button>
          <button
            onClick={cycleRepeat}
            className={cn(
              "p-2 transition active:scale-90",
              repeat !== "off" ? "text-primary" : "text-muted-foreground",
            )}
            aria-label="تکرار"
          >
            {repeat === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
          </button>
        </div>

        {/* Secondary actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setShowLyrics((v) => !v)}
            className={cn(
              "glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm",
              showLyrics && "text-primary",
            )}
          >
            <Type className="size-4" /> {showLyrics ? "پنهان‌کردن متن" : "متن ترانه"}
          </button>
          <QualityMenu quality={quality} onChange={setQuality} />
          <button
            onClick={() => void downloadTrack(track, quality)}
            disabled={downloaded}
            className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm disabled:opacity-50"
          >
            {isOffline || downloaded ? (
              <WifiOff className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {downloaded ? "دانلود شد" : "دانلود"}
          </button>
          <button
            onClick={share}
            className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm"
          >
            <Share2 className="size-4" /> اشتراک
          </button>
          <TrackMenu track={track}>
            <button className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm">
              <Plus className="size-4" /> بیشتر
            </button>
          </TrackMenu>
          <SleepButton />
        </div>

        {showLyrics && (
          <div className="mt-6 flex-1">
            <Lyrics
              lines={lyrics.data?.lines ?? []}
              current={currentTime}
              loading={lyrics.isLoading}
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
              filled ? "bg-primary" : "bg-white/15",
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
}: {
  lines: { time: number; text: string }[];
  current: number;
  loading: boolean;
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

  if (loading) return <div className="skeleton h-40 w-full rounded-2xl" />;
  if (!lines.length) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
        متنی برای این آهنگ پیدا نشد.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="no-scrollbar max-h-80 space-y-3 overflow-y-auto pb-24 pt-8 text-center"
    >
      {lines.map((l, i) => (
        <p
          key={`${i}-${l.time}`}
          data-lrc={i}
          className={cn(
            "px-4 text-base leading-relaxed transition-all",
            i === activeIdx ? "text-lg font-bold text-foreground" : "text-muted-foreground/60",
          )}
        >
          {l.text}
        </p>
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
