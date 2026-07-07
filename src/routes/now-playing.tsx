import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { formatTime, getLyric, getPicUrl } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import {
  ChevronDown, Heart, ListMusic, Pause, Play, Plus, Repeat, Repeat1, Share2,
  Shuffle, SkipBack, SkipForward, Timer, Download, X,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerHeader } from "@/components/ui/drawer";
import { QUALITIES } from "@/lib/gdmusic";
import { downloadTrack } from "@/lib/download";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrackMenu } from "@/components/music/TrackMenu";

export const Route = createFileRoute("/now-playing")({
  head: () => ({ meta: [{ title: "Now Playing — muis" }] }),
  component: NowPlaying,
});

function NowPlaying() {
  const router = useRouter();
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
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
  const key = track ? trackKey(track) : "";
  const isFav = favorites.includes(key);

  const pic = useQuery({
    queryKey: ["pic", key, "800"],
    enabled: !!track,
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
        <div className="py-24 text-center text-muted-foreground">Nothing playing.</div>
      </AppShell>
    );
  }

  const share = async () => {
    const url = window.location.origin + `/?q=${encodeURIComponent(track.name + " " + track.artist.join(" "))}`;
    try {
      if (navigator.share) await navigator.share({ title: track.name, text: track.artist.join(", "), url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      {/* Blurred background from artwork */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {pic.data && (
          <img
            src={pic.data}
            alt=""
            aria-hidden
            className="size-full object-cover opacity-60 blur-3xl saturate-150"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-40 pt-6">
        <header className="flex items-center justify-between">
          <button onClick={() => router.history.back()} className="glass flex size-10 items-center justify-center rounded-full">
            <ChevronDown className="size-5" />
          </button>
          <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">Now Playing</div>
          <QueueDrawer />
        </header>

        {/* Cover */}
        <div className="mx-auto mt-8 w-full max-w-sm">
          <div className="relative aspect-square overflow-hidden rounded-3xl shadow-2xl shadow-black/60">
            {pic.data ? (
              <img src={pic.data} alt={track.name} className="size-full object-cover" />
            ) : (
              <div className="skeleton size-full" />
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{track.name}</h1>
            <p className="truncate text-muted-foreground">{track.artist.join(", ")}</p>
          </div>
          <button
            onClick={() => toggleFav(track)}
            className={cn("shrink-0 rounded-full p-2", isFav ? "text-primary" : "text-muted-foreground")}
            aria-label="Favorite"
          >
            <Heart className={cn("size-6", isFav && "fill-current")} />
          </button>
        </div>

        {/* Waveform / progress */}
        <div className="mt-6">
          <Waveform current={currentTime} duration={duration} />
          <Slider
            value={[Math.min(currentTime, duration || 0)]}
            max={Math.max(duration || 0, 1)}
            step={0.5}
            onValueChange={(v) => seek(v[0])}
            className="mt-2"
          />
          <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(0, (duration || 0) - currentTime))}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between">
          <button onClick={toggleShuffle} className={cn("p-2", shuffle ? "text-primary" : "text-muted-foreground")}>
            <Shuffle className="size-5" />
          </button>
          <button onClick={prev} className="p-2 text-foreground">
            <SkipBack className="size-8" />
          </button>
          <button
            onClick={togglePlay}
            className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transition active:scale-95"
          >
            {isPlaying ? <Pause className="size-7" /> : <Play className="size-7 pl-1" />}
          </button>
          <button onClick={next} className="p-2 text-foreground">
            <SkipForward className="size-8" />
          </button>
          <button onClick={cycleRepeat} className={cn("p-2", repeat !== "off" ? "text-primary" : "text-muted-foreground")}>
            {repeat === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
          </button>
        </div>

        {/* Secondary actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => setShowLyrics((v) => !v)} className="glass rounded-full px-4 py-2 text-sm">
            {showLyrics ? "Hide lyrics" : "Show lyrics"}
          </button>
          <QualityMenu quality={quality} onChange={setQuality} />
          <button onClick={() => downloadTrack(track, quality)} className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm">
            <Download className="size-4" /> Download
          </button>
          <button onClick={share} className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm">
            <Share2 className="size-4" /> Share
          </button>
          <TrackMenu track={track}>
            <button className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm">
              <Plus className="size-4" /> More
            </button>
          </TrackMenu>
          <SleepButton />
        </div>

        {showLyrics && (
          <div className="mt-6 flex-1">
            <Lyrics lines={lyrics.data?.lines ?? []} current={currentTime} loading={lyrics.isLoading} />
          </div>
        )}
      </div>
    </div>
  );
}

function Waveform({ current, duration }: { current: number; duration: number }) {
  // static pseudo-random bars, fixed seed by track duration
  const bars = useMemo(() => Array.from({ length: 64 }, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.7 + 3)) * 0.7), []);
  const progress = duration > 0 ? current / duration : 0;
  return (
    <div className="flex h-10 items-end gap-[2px]">
      {bars.map((h, i) => {
        const on = i / bars.length <= progress;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm transition-colors",
              on ? "bg-primary" : "bg-white/15",
            )}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

function Lyrics({ lines, current, loading }: { lines: { time: number; text: string }[]; current: number; loading: boolean }) {
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
  if (!lines.length) return <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">No lyrics found.</div>;

  return (
    <div ref={containerRef} className="max-h-80 overflow-y-auto no-scrollbar space-y-3 pb-24 pt-8 text-center">
      {lines.map((l, i) => (
        <p
          key={`${i}-${l.time}`}
          data-lrc={i}
          className={cn(
            "px-4 text-base leading-relaxed transition-all",
            i === activeIdx ? "text-lg font-semibold text-foreground" : "text-muted-foreground/70",
          )}
        >
          {l.text}
        </p>
      ))}
    </div>
  );
}

function QualityMenu({ quality, onChange }: { quality: number; onChange: (q: 128 | 320 | 999) => void }) {
  return (
    <div className="glass flex overflow-hidden rounded-full">
      {QUALITIES.map((q) => (
        <button
          key={q.br}
          onClick={() => onChange(q.br as 128 | 320 | 999)}
          className={cn(
            "px-3 py-2 text-xs font-medium",
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
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className={cn("glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm", sleepAt && "text-primary")}>
          <Timer className="size-4" /> Sleep
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Sleep timer</DrawerTitle>
        </DrawerHeader>
        <div className="grid grid-cols-3 gap-3 p-4">
          {[5, 10, 15, 30, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => { setSleep(m); toast.success(`Sleep in ${m} min`); setOpen(false); }}
              className="glass rounded-2xl p-4 text-lg font-semibold"
            >
              {m}m
            </button>
          ))}
          <button
            onClick={() => { setSleep(null); setOpen(false); }}
            className="col-span-3 rounded-full py-2 text-sm text-destructive"
          >
            Cancel
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function QueueDrawer() {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const remove = usePlayer((s) => s.removeFromQueue);
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="glass flex size-10 items-center justify-center rounded-full">
          <ListMusic className="size-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Queue · {queue.length} tracks</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-y-auto px-2 pb-6">
          {queue.map((t, i) => (
            <div key={`${trackKey(t)}-${i}`} className={cn("flex items-center gap-3 rounded-xl px-2 py-2", i === index && "bg-white/5")}>
              <div className="w-6 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-sm", i === index ? "text-primary font-medium" : "text-foreground")}>
                  {t.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">{t.artist.join(", ")}</div>
              </div>
              <button onClick={() => remove(i)} className="rounded-full p-2 text-muted-foreground hover:text-destructive" aria-label="Remove">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}