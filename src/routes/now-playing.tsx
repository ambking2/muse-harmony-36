import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button as GlisseButton, Menu as GlisseMenu } from "glisse";
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
  Check, ChevronDown, Disc3, Download, Ellipsis, Heart, Library, ListMusic,
  ListPlus, Mic2, Pause, Play, Plus, Repeat, Repeat1, Share2, Shuffle,
  SkipBack, SkipForward, SlidersHorizontal, Timer, Music, Type,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadTrack } from "@/lib/download";
import { queueRegistry } from "@/lib/ui-control";
import { shareTrack } from "@/lib/share-link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { floatUp, iconPop } from "@/lib/design/motion-gsap";

export const Route = createFileRoute("/now-playing")({
  head: () => ({ meta: [{ title: "در حال پخش — muis" }] }),
  component: NowPlayingRoute,
});

function NowPlayingRoute() {
  return (
    <AppShell>
      <NowPlayingOverlay />
    </AppShell>
  );
}

export function NowPlayingOverlay() {
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
  const setExpanded = usePlayer((s) => s.setExpanded);

  const favorites = useLibrary((s) => s.favorites);
  const toggleFav = useLibrary((s) => s.toggleFavorite);
  const downloads = useLibrary((s) => s.downloads);
  const key = track ? trackKey(track) : "";
  const isFav = favorites.includes(key);
  const downloaded = downloads.some((d) => d.id.startsWith(`${key}:`) && d.status === "done");
  const library = useLibrary((s) => s.library);
  const playlists = useLibrary((s) => s.playlists);
  const addToLibrary = useLibrary((s) => s.addToLibrary);
  const removeFromLibrary = useLibrary((s) => s.removeFromLibrary);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const playNext = usePlayer((s) => s.playNext);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const inLibrary = library.some((item) => trackKey(item) === key);

  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const minimize = () => setExpanded(false);

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
      <div className="fixed inset-0 z-[80] grid h-dvh place-items-center bg-background px-6">
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
      </div>
    );
  }

  const art = track.picUrl ?? pic.data;
  const remaining = Math.max(0, (duration || 0) - currentTime);

  // Rejects rather than resolving false: LoadingButton shows "کپی شد" only
  // after the action resolves, so a refused clipboard has to take the failure
  // path or the button would confirm a copy that never happened.
  const share = async () => {
    if (!(await shareTrack(track))) throw new Error("clipboard refused");
    toast.success("لینک آهنگ کپی شد", {
      description: `${track.title} · ${track.artist.join("، ")}`,
      duration: 2600,
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] isolate h-dvh overflow-hidden bg-background"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30, mass: 0.85 }}
    >
      <div className="now-playing-screen relative h-full min-h-0 overflow-hidden text-foreground">
        {/* Blurred background from the artwork, tinted by the extracted accent. */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          {art && (
            <img
              src={art}
              alt=""
              aria-hidden
              decoding="async"
              className="size-full object-cover opacity-50 blur-2xl saturate-125 max-sm:blur-lg"
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

        <div className="now-playing-layout mx-auto flex h-full min-h-0 max-w-lg flex-col px-6 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-[max(env(safe-area-inset-top),0.4rem)]">
          {/* Two independent controls: the song menu on the reading edge, the
              collapse chevron at the other end. */}
          <header className="flex items-center justify-between">
            <div className="relative flex items-center gap-1">
              <GlisseMenu
                aria-label="امکانات آهنگ"
                align="end"
                className="muis-player-glisse-menu"
                icon={<Ellipsis className="size-5" strokeWidth={2} />}
                items={[
                  { label: "متن ترانه", icon: <Type />, onSelect: () => setLyricsOpen(true) },
                  { label: "صف پخش", icon: <ListMusic />, onSelect: () => queueRegistry.openAll() },
                  ...(track.album ? [{ label: "رفتن به آلبوم", icon: <Disc3 />, onSelect: () => void router.navigate({ to: "/album/$name", params: { name: track.album! } }) }] : []),
                  ...(track.artist[0] ? [{ label: "صفحه خواننده", icon: <Mic2 />, onSelect: () => void router.navigate({ to: "/artist/$name", params: { name: track.artist[0] } }) }] : []),
                  "separator",
                  { label: "پخش بعدی", icon: <ListPlus />, onSelect: () => playNext(track) },
                  { label: "افزودن به صف", icon: <ListMusic />, onSelect: () => addToQueue(track) },
                  { label: "افزودن به پلی‌لیست", icon: <Plus />, onSelect: () => setPlaylistOpen(true) },
                  {
                    label: inLibrary ? "حذف از کتابخانه" : "افزودن به کتابخانه",
                    icon: <Library /> ,
                    onSelect: () => {
                      if (inLibrary) removeFromLibrary(key);
                      else { addToLibrary(track); toast.success("به کتابخانه اضافه شد"); }
                    },
                  },
                  "separator",
                  { label: downloaded ? "دانلود شده" : "دانلود برای پخش آفلاین", icon: <Download />, disabled: downloaded, onSelect: () => void downloadTrack(track, quality) },
                  { label: "کیفیت صدا · " + (quality === 999 ? "FLAC" : quality), icon: <SlidersHorizontal />, onSelect: () => setQualityOpen(true) },
                  { label: "تایمر خواب", icon: <Timer />, onSelect: () => setSleepOpen(true) },
                  "separator",
                  { label: "اشتراک‌گذاری آهنگ", icon: <Share2 />, onSelect: () => void share().catch(() => toast.error("اشتراک‌گذاری انجام نشد", {
                    description: "دوباره تلاش کن یا دسترسی کپی لینک را بررسی کن.",
                    duration: 3200,
                  })) },
                ]}
              />
              <button
                type="button"
                onClick={minimize}
                className="glass-btn press !rounded-none !border-0 !bg-transparent !shadow-none text-ios-label-secondary"
                aria-label="بستن صفحه پخش"
              >
                <ChevronDown className="size-5" strokeWidth={2.2} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void share().catch(() => toast.error("اشتراک‌گذاری انجام نشد", {
                description: "دوباره تلاش کن یا دسترسی کپی لینک را بررسی کن.",
                duration: 3200,
              }))}
              className="glass-btn press text-ios-label-secondary"
              aria-label="اشتراک‌گذاری آهنگ"
            >
              <Share2 className="size-5" strokeWidth={2} />
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
                className="relative aspect-square max-h-[min(32dvh,calc(100vw-3rem))] w-full overflow-hidden rounded-sheet shadow-2xl shadow-black/60"
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

            {/* Track details stay on the left; the favorite action sits opposite on the right. */}
            <div className="mt-1 flex shrink-0 items-center justify-between gap-4" dir="ltr">
              <div className="min-w-0 flex-1 text-left">
                <h1 className="type-title-2 truncate">{track.name}</h1>
                <div className="mt-0.5 flex min-w-0 flex-wrap justify-start gap-x-2">
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
              <div className="shrink-0">
                <GlisseButton
                  type="button"
                  className={cn("muis-glisse-player-favorite", isFav && "is-favorite")}
                  icon={<Heart className={cn("size-5", isFav && "fill-current")} strokeWidth={1.9} />}
                  aria-label={isFav ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                  aria-pressed={isFav}
                  onClick={(event) => {
                    if (!isFav) {
                      floatUp(event.currentTarget, "به علاقه‌مندی‌ها اضافه شد");
                      iconPop(event.currentTarget);
                    }
                    toggleFav(track);
                  }}
                />
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3">
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
          <div className="now-playing-transport mx-auto -mt-16 flex w-full max-w-md shrink-0 flex-nowrap items-center justify-between">
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

      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent className="material-thick max-h-[80svh] gap-3 overflow-y-auto rounded-sheet p-5">
          <DialogHeader><DialogTitle className="type-title-3">افزودن به پلی‌لیست</DialogTitle></DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {playlists.map((playlist) => {
              const exists = playlist.trackKeys.includes(key);
              return (
                <button key={playlist.id} type="button" disabled={exists}
                  onClick={() => { addToPlaylist(playlist.id, track); toast.success(`به «${playlist.name}» اضافه شد`); setPlaylistOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition hover:bg-ios-fill disabled:opacity-45">
                  <ListMusic className="size-5 shrink-0 text-ios-tint" />
                  <span className="min-w-0 flex-1 truncate text-sm">{playlist.name}</span>
                  {exists && <Check className="size-4 text-ios-tint" /> }
                </button>
              );
            })}
            {playlists.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">هنوز پلی‌لیستی نساخته‌اید.</p>}
          </div>
          <div className="flex gap-2">
            <input value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)}
              placeholder="نام پلی‌لیست جدید" className="min-w-0 flex-1 rounded-xl border border-ios-separator bg-ios-fill/50 px-3 py-2 text-sm outline-none focus:border-ios-tint" />
            <button type="button" disabled={!newPlaylistName.trim()}
              onClick={() => { const created = createPlaylist(newPlaylistName.trim()); addToPlaylist(created.id, track); setNewPlaylistName(""); setPlaylistOpen(false); toast.success(`به «${created.name}» اضافه شد`); }}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">ساخت</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qualityOpen} onOpenChange={setQualityOpen}>
        <DialogContent className="material-thick gap-3 rounded-sheet p-5">
          <DialogHeader><DialogTitle className="type-title-3">کیفیت صدا</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {QUALITIES.map((q) => (
              <button key={q.br} type="button" aria-pressed={quality === q.br}
                onClick={() => { setQuality(q.br as Quality); setQualityOpen(false); }}
                className={cn("rounded-xl border px-3 py-3 text-sm font-semibold transition", quality === q.br ? "border-primary bg-primary text-primary-foreground" : "border-ios-separator bg-ios-fill/40")}>
                {q.br === 999 ? "FLAC" : `${q.br} kbps`}
                {quality === q.br && <Check className="mr-2 inline size-4" /> }
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sleepOpen} onOpenChange={setSleepOpen}>
        <DialogContent className="material-thick gap-3 rounded-sheet p-5">
          <DialogHeader><DialogTitle className="type-title-3">تایمر خواب</DialogTitle></DialogHeader>
          <SleepSection />
        </DialogContent>
      </Dialog>

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
    </motion.div>
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
  const [now, setNow] = useState(() => Date.now());
  const remainingSeconds = sleepAt ? Math.max(0, Math.ceil((sleepAt - now) / 1000)) : 0;
  const [seconds, setSeconds] = useState(() => remainingSeconds || 300);

  // Keep the countdown fresh without tying slider state to every timer tick.
  useEffect(() => {
    if (!sleepAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [sleepAt]);

  // When an existing timer is opened, initialize the slider once for that timer.
  useEffect(() => {
    if (sleepAt) setSeconds(Math.max(1, Math.min(3600, Math.ceil((sleepAt - Date.now()) / 1000))));
  }, [sleepAt]);

  const formatSleepDuration = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    if (minutes === 0) return `${rest} ثانیه`;
    if (rest === 0) return `${minutes} دقیقه`;
    return `${minutes} دقیقه و ${rest} ثانیه`;
  };
  const durationText = (value: number) => (
    <span dir="rtl" style={{ unicodeBidi: "isolate", display: "inline-block" }}>
      {formatSleepDuration(value)}
    </span>
  );
  const applyTimer = (value: number) => {
    const safeValue = Math.max(1, Math.min(3600, Math.round(value)));
    setSeconds(safeValue);
    setSleep(safeValue / 60);
    toast.success(`تایمر خواب روی ${formatSleepDuration(safeValue)} تنظیم شد`);
  };

  return (
    <div className="px-3 py-3">
      {sleepAt && (
        <p className="type-footnote mb-3 flex items-center gap-1.5 text-ios-label-secondary">
          <Timer className="size-3.5" /> {durationText(remainingSeconds)} مانده
        </p>
      )}
      <div className="glass rounded-2xl p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs text-ios-label-secondary">مدت زمان</span>
          <span className="text-sm font-semibold">{durationText(seconds)}</span>
        </div>
        <Slider
          value={[seconds]}
          min={1}
          max={3600}
          step={1}
          onValueChange={(value) => setSeconds(value[0])}
          onValueCommit={(value) => applyTimer(value[0])}
          aria-label="مدت تایمر خواب بر حسب ثانیه"
        />
        <div className="mt-2 flex justify-between text-[11px] text-ios-label-tertiary">
          <span dir="rtl" style={{ unicodeBidi: "isolate" }}>
            ۱ ثانیه
          </span>
          <span dir="rtl" style={{ unicodeBidi: "isolate" }}>
            ۱ ساعت
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => applyTimer(300)}
            className="glass flex-1 rounded-xl py-2 text-xs font-medium"
          >
            ۵ دقیقه
          </button>
          <button
            onClick={() => applyTimer(1800)}
            className="glass flex-1 rounded-xl py-2 text-xs font-medium"
          >
            ۳۰ دقیقه
          </button>
          <button
            onClick={() => applyTimer(3600)}
            className="glass flex-1 rounded-xl py-2 text-xs font-medium"
          >
            ۱ ساعت
          </button>
        </div>
        {sleepAt && (
          <button
            onClick={() => {
              setSleep(null);
              setSeconds(300);
            }}
            className="mt-2 w-full rounded-xl py-2 text-sm text-destructive"
          >
            لغو تایمر
          </button>
        )}
      </div>
    </div>
  );
}
