import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Artwork } from "@/components/music/Artwork";
import { TrackMenu } from "@/components/music/TrackMenu";
import { Toaster } from "@/components/ui/sonner";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerHeader, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { formatTime, getLyric, getPicUrl, QUALITIES } from "@/lib/gdmusic";
import { trackKey, type LyricLine, type Quality } from "@/lib/types";
import { ChevronDown, Heart, ListMusic, Pause, Play, Plus, Repeat, Repeat1, Share2, Shuffle, SkipBack, SkipForward, Timer, Download, X, ArrowUp, ArrowDown, Music2, Mic2, LoaderCircle, Volume2, VolumeX } from "lucide-react";
import { downloadTrack } from "@/lib/download";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/now-playing")({
  head: () => ({ meta: [{ title: "Now Playing — muis" }] }),
  component: NowPlaying,
});

function NowPlaying() {
  const router = useRouter();
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isBuffering = usePlayer((s) => s.isBuffering);
  const error = usePlayer((s) => s.error);
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
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const key = track ? trackKey(track) : "";
  const isFavorite = favorites.includes(key);
  const [showLyrics, setShowLyrics] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pic = useQuery({
    queryKey: ["pic", track?.source, track?.pic_id, "800"],
    enabled: !!track?.pic_id,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 800),
  });
  const lyrics = useQuery({
    queryKey: ["lyric", key],
    enabled: !!track && showLyrics,
    staleTime: 60 * 60_000,
    queryFn: () => getLyric(track!.source, track!.lyric_id),
  });

  if (!track) return <AppShell><div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><Music2 className="mb-6 size-16 text-primary" strokeWidth={1} /><h1 className="text-2xl font-semibold">Your next song is waiting</h1><p className="mt-3 text-sm text-muted-foreground">Choose something you love and make yourself at home.</p><Link to="/explore" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Explore music</Link></div></AppShell>;

  const close = () => {
    if (router.history.canGoBack()) router.history.back();
    else void router.navigate({ to: "/" });
  };
  const share = async () => {
    const url = new URL("/explore", window.location.origin);
    url.searchParams.set("q", `${track.name} ${track.artist.join(" ")}`);
    try {
      if (navigator.share) await navigator.share({ title: track.name, text: track.artist.join(", "), url: url.href });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url.href); toast.success("Search link copied"); }
      else toast.error("Sharing is not supported in this browser.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Could not share this song.");
    }
  };
  const download = async () => {
    setDownloading(true);
    try { await downloadTrack(track, quality); }
    finally { setDownloading(false); }
  };

  return (
    <div className="relative isolate min-h-dvh overflow-x-clip text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {pic.data && <img src={pic.data} alt="" referrerPolicy="no-referrer" className="size-full scale-110 object-cover opacity-35 blur-3xl saturate-150" />}
        <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/70 to-background" />
      </div>
      <main className="mx-auto max-w-5xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <button type="button" onClick={close} aria-label="Close player" className="glass icon-button"><ChevronDown aria-hidden="true" className="size-5" /></button>
          <div className="min-w-0 text-center"><p className="eyebrow text-muted-foreground">Now playing</p><p className="mt-1 max-w-48 truncate text-xs font-medium">{track.album || "Your music"}</p></div>
          <QueueDrawer />
        </header>
        <div className="grid items-center gap-8 md:min-h-[70vh] md:grid-cols-2 md:gap-12">
          <div className="mx-auto w-full max-w-sm md:max-w-none">
            <div className={cn("artwork-shadow relative aspect-square overflow-hidden rounded-[2rem] transition-transform duration-500", !isPlaying && "scale-[0.94]")}>
              {pic.data ? <img src={pic.data} alt={`${track.name} artwork`} referrerPolicy="no-referrer" className="size-full object-cover" /> : <div className="hero-panel flex size-full items-center justify-center"><Music2 aria-hidden="true" className="size-24 text-primary/60" strokeWidth={1} /></div>}
            </div>
            <p className="eyebrow mt-5 text-center text-muted-foreground">{isBuffering && isPlaying ? "Loading your sound…" : isPlaying ? "Just you and the music" : "Take your time"}</p>
          </div>
          <section aria-label="Playback controls" className="mx-auto w-full max-w-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h1 className="text-balance break-words text-2xl font-bold tracking-tight sm:text-3xl">{track.name}</h1><p className="mt-2 text-base text-muted-foreground">{track.artist.join(", ")}</p></div>
              <button type="button" onClick={() => toggleFavorite(track)} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={isFavorite} className={cn("glass icon-button", isFavorite ? "text-primary" : "text-muted-foreground")}><Heart aria-hidden="true" className={cn("size-5", isFavorite && "fill-current")} /></button>
            </div>
            {error && <p role="alert" className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <div className="mt-7">
              <input type="range" aria-label="Playback position" min={0} max={Math.max(1, duration)} step={0.5} value={Math.min(currentTime, duration)} disabled={!duration} onChange={(event) => seek(Number(event.target.value))} className="h-8 w-full accent-primary" />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground"><span>{formatTime(currentTime)}</span><span>−{formatTime(Math.max(0, duration - currentTime))}</span></div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button type="button" onClick={toggleShuffle} aria-label="Shuffle" aria-pressed={shuffle} className={cn("icon-button", shuffle ? "bg-primary/10 text-primary" : "text-muted-foreground")}><Shuffle aria-hidden="true" className="size-5" /></button>
              <button type="button" onClick={prev} aria-label="Previous track" className="icon-button"><SkipBack aria-hidden="true" className="size-7 fill-current" /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="flex size-[4.5rem] shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition-transform active:scale-95">{isBuffering && isPlaying ? <LoaderCircle aria-hidden="true" className="size-7 animate-spin" /> : isPlaying ? <Pause aria-hidden="true" className="size-7 fill-current" /> : <Play aria-hidden="true" className="ml-1 size-7 fill-current" />}</button>
              <button type="button" onClick={next} aria-label="Next track" className="icon-button"><SkipForward aria-hidden="true" className="size-7 fill-current" /></button>
              <button type="button" onClick={cycleRepeat} aria-label={`Repeat: ${repeat}. Change repeat mode`} aria-pressed={repeat !== "off"} className={cn("icon-button", repeat !== "off" ? "bg-primary/10 text-primary" : "text-muted-foreground")}>{repeat === "one" ? <Repeat1 aria-hidden="true" className="size-5" /> : <Repeat aria-hidden="true" className="size-5" />}</button>
            </div>
            <VolumeControl />
            <div className="glass mt-5 flex items-center justify-between gap-2 rounded-full p-1.5">
              <button type="button" onClick={() => setShowLyrics((show) => !show)} aria-expanded={showLyrics} aria-controls="lyrics-panel" className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm", showLyrics ? "bg-white/10 text-primary" : "text-muted-foreground")}><Mic2 className="size-4" /> Lyrics</button>
              <SleepButton />
              <button type="button" onClick={() => void share()} aria-label="Share song" className="icon-button text-muted-foreground"><Share2 className="size-4" /></button>
              <TrackMenu track={track}><button type="button" aria-label="More song actions" className="icon-button text-muted-foreground"><Plus className="size-5" /></button></TrackMenu>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <QualityMenu quality={quality} onChange={setQuality} />
              <button type="button" disabled={downloading} onClick={() => void download()} className="flex min-h-11 items-center gap-2 px-2 text-xs text-muted-foreground"><Download className="size-4" /> {downloading ? "Downloading…" : "Download"}</button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Selected quality; availability depends on the source.</p>
          </section>
        </div>
        <section id="lyrics-panel" hidden={!showLyrics} className="glass mt-8 rounded-[2rem] p-5 sm:p-8">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">The words behind the sound</h2><button type="button" onClick={() => setShowLyrics(false)} aria-label="Hide lyrics" className="icon-button"><X className="size-4" /></button></div>
          <Lyrics lines={lyrics.data?.lines ?? []} current={currentTime} loading={lyrics.isFetching} seek={seek} />
        </section>
      </main>
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}

function VolumeControl() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  return <div className="mt-5 flex items-center gap-3"><button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="icon-button text-muted-foreground">{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button><input type="range" aria-label="Volume" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(event) => setVolume(Number(event.target.value))} className="h-8 min-w-0 flex-1 accent-primary" /><span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{Math.round((muted ? 0 : volume) * 100)}%</span></div>;
}

function Lyrics({ lines, current, loading, seek }: { lines: LyricLine[]; current: number; loading: boolean; seek: (time: number) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const lastInteraction = useRef(0);
  const reducedMotion = useReducedMotion();
  const active = useMemo(() => {
    let index = -1;
    for (let i = 0; i < lines.length && lines[i].time <= current; i++) index = i;
    return index;
  }, [lines, current]);
  useEffect(() => {
    const root = container.current;
    const line = root?.querySelector<HTMLElement>(`[data-line="${active}"]`);
    if (!root || !line || Date.now() - lastInteraction.current < 5000) return;
    root.scrollTo({ top: root.scrollTop + line.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientHeight / 2 + line.clientHeight / 2, behavior: reducedMotion ? "auto" : "smooth" });
  }, [active, reducedMotion]);
  if (loading && !lines.length) return <p role="status" className="py-8 text-center text-muted-foreground">Finding the lyrics…</p>;
  if (!lines.length) return <p className="py-8 text-center text-sm text-muted-foreground">No synced lyrics available for this song.</p>;
  return <><p className="mb-3 text-xs text-muted-foreground">Tap a line to jump to that moment.</p><div ref={container} onWheel={() => { lastInteraction.current = Date.now(); }} onTouchStart={() => { lastInteraction.current = Date.now(); }} onKeyDown={() => { lastInteraction.current = Date.now(); }} className="relative max-h-80 space-y-2 overflow-y-auto overscroll-contain py-8">{lines.map((line, index) => <button type="button" key={`${index}-${line.time}`} data-line={index} aria-current={active === index ? "true" : undefined} onClick={() => seek(line.time)} className={cn("block min-h-11 w-full rounded-xl px-3 py-2 text-left text-xl font-semibold leading-relaxed transition-colors sm:text-2xl", index === active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>{line.text}</button>)}</div></>;
}

function QualityMenu({ quality, onChange }: { quality: Quality; onChange: (quality: Quality) => void }) {
  return <div role="group" aria-label="Audio quality" className="flex items-center rounded-full bg-white/5 p-1">{QUALITIES.map((item) => <button type="button" key={item.br} onClick={() => onChange(item.br)} aria-label={item.label} aria-pressed={quality === item.br} className={cn("min-h-11 rounded-full px-3 text-xs font-medium", quality === item.br ? "bg-white/10 text-primary" : "text-muted-foreground")}>{item.br === 999 ? "FLAC" : item.br}</button>)}</div>;
}

function SleepButton() {
  const sleepAt = usePlayer((s) => s.sleepAt);
  const setSleep = usePlayer((s) => s.setSleepMinutes);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!sleepAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sleepAt]);
  const remaining = sleepAt && now ? Math.max(0, Math.ceil((sleepAt - now) / 60_000)) : null;
  return <Drawer open={open} onOpenChange={setOpen}><DrawerTrigger asChild><button type="button" className={cn("flex min-h-11 items-center gap-2 rounded-full px-3 text-sm", sleepAt ? "text-primary" : "text-muted-foreground")}><Timer className="size-4" /> {remaining !== null ? `${remaining}m` : "Sleep"}</button></DrawerTrigger><DrawerContent className="mx-auto max-w-xl rounded-t-[2rem] pb-[max(1rem,env(safe-area-inset-bottom))]"><DrawerHeader><DrawerTitle>Drift off to your music</DrawerTitle><DrawerDescription>Playback pauses when the timer ends.</DrawerDescription></DrawerHeader><div className="grid grid-cols-3 gap-3 px-5 pb-4">{[5, 10, 15, 30, 45, 60].map((minutes) => <button type="button" key={minutes} onClick={() => { setSleep(minutes); toast.success(`Sleep timer set for ${minutes} minutes`); setOpen(false); }} className="glass rounded-2xl p-4 text-lg font-semibold">{minutes}<span className="ml-1 text-xs text-muted-foreground">min</span></button>)}<button type="button" onClick={() => { setSleep(null); setOpen(false); }} className="col-span-3 min-h-11 rounded-full text-sm text-destructive">Turn off timer</button><DrawerClose className="col-span-3 min-h-11 rounded-full text-sm text-muted-foreground">Close</DrawerClose></div></DrawerContent></Drawer>;
}

function QueueDrawer() {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const remove = usePlayer((s) => s.removeFromQueue);
  const select = usePlayer((s) => s.selectQueueIndex);
  const move = usePlayer((s) => s.moveInQueue);
  return <Drawer><DrawerTrigger asChild><button type="button" aria-label="Open play queue" className="glass icon-button"><ListMusic className="size-5" /></button></DrawerTrigger><DrawerContent className="mx-auto max-w-2xl rounded-t-[2rem] pb-[max(1rem,env(safe-area-inset-bottom))]"><DrawerHeader><div className="flex items-center justify-between"><DrawerTitle>Your queue · {queue.length}</DrawerTitle><DrawerClose aria-label="Close queue" className="icon-button"><X className="size-4" /></DrawerClose></div><DrawerDescription>Tap a song to play. Use the arrows to change the order.</DrawerDescription></DrawerHeader><div className="max-h-[60dvh] space-y-1 overflow-y-auto overscroll-contain px-3 pb-4">{queue.map((track, position) => <div key={`${trackKey(track)}-${position}`} className={cn("flex items-center gap-1 rounded-2xl p-1.5 sm:gap-2", position === index && "bg-white/10")}><button type="button" aria-label={`Play ${track.name}`} aria-current={position === index ? "true" : undefined} onClick={() => select(position)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl text-left"><Artwork track={track} size={100} className="hidden size-10 shrink-0 sm:block" /><div className="min-w-0"><p className={cn("truncate text-sm font-medium", position === index && "text-primary")}>{track.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{position === index ? "Now playing · " : ""}{track.artist.join(", ")}</p></div></button><button type="button" onClick={() => move(position, position - 1)} disabled={position === 0} aria-label={`Move ${track.name} up`} className="icon-button text-muted-foreground"><ArrowUp className="size-4" /></button><button type="button" onClick={() => move(position, position + 1)} disabled={position === queue.length - 1} aria-label={`Move ${track.name} down`} className="icon-button text-muted-foreground"><ArrowDown className="size-4" /></button><button type="button" onClick={() => remove(position)} aria-label={`Remove ${track.name} from queue`} className="icon-button text-muted-foreground hover:text-destructive"><X className="size-4" /></button></div>)}</div></DrawerContent></Drawer>;
}
