import { Link } from "@tanstack/react-router";
import { Heart, ListMusic, Pause, Play, SkipForward, SkipBack, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { getPicUrl } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { queueRegistry } from "@/lib/ui-control";
import { cn } from "@/lib/utils";

export function MiniPlayer() {
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isBuffering = usePlayer((s) => s.isBuffering);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const queueLength = usePlayer((s) => s.queue.length);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);

  const key = track ? trackKey(track) : "";
  const isFav = !!key && favorites.includes(key);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const pic = useQuery({
    queryKey: ["pic", key, "200"],
    enabled: !!track && !track!.picUrl,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 200),
  });

  return (
    <AnimatePresence>
      {track ? (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex justify-center px-3"
        >
          <div
            className="glass-strong pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
            style={{
              boxShadow:
                "0 18px 50px -20px color-mix(in oklch, var(--track-accent) 70%, transparent)",
            }}
          >
            {/* Accent wash tinted by the artwork. */}
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                background:
                  "linear-gradient(to left, color-mix(in oklch, var(--track-accent) 55%, transparent), transparent 70%)",
              }}
            />

            <Link
              to="/now-playing"
              className="relative flex items-center gap-3 overflow-hidden p-2"
              aria-label="در حال پخش"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                {pic.data || track.picUrl ? (
                  <img
                    src={track.picUrl ?? pic.data ?? ""}
                    alt=""
                    className={cn(
                      "size-full object-cover",
                      isBuffering && "animate-pulse opacity-60",
                    )}
                  />
                ) : (
                  <div className="skeleton size-full" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{track.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {track.artist.join("، ")}
                </div>
              </div>

              {track.srcUrl && (
                <span title="پخش آفلاین" className="shrink-0 text-muted-foreground">
                  <WifiOff className="size-3.5" />
                </span>
              )}
            </Link>

            {/* Controls sit above the link so taps don't navigate. */}
            <div className="relative flex items-center justify-end gap-1 px-2 pb-2">
              <button
                type="button"
                onClick={() => {
                  toggleFavorite(track);
                }}
                className={cn(
                  "hidden size-9 items-center justify-center rounded-full text-muted-foreground transition sm:flex",
                  isFav && "text-primary",
                )}
                aria-label="علاقه‌مندی"
              >
                <Heart className={cn("size-4", isFav && "fill-current")} />
              </button>
              <button
                type="button"
                onClick={() => prev()}
                className="flex size-9 items-center justify-center rounded-full text-foreground/80 transition hover:text-foreground"
                aria-label="آهنگ قبلی"
              >
                <SkipBack className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => togglePlay()}
                className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95"
                aria-label={isPlaying ? "توقف" : "پخش"}
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button
                type="button"
                onClick={() => next()}
                className="flex size-9 items-center justify-center rounded-full text-foreground/80 transition hover:text-foreground"
                aria-label="آهنگ بعدی"
              >
                <SkipForward className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => queueRegistry.openAll()}
                className="relative flex size-9 items-center justify-center rounded-full text-foreground/80 transition hover:text-foreground"
                aria-label="صف پخش"
              >
                <ListMusic className="size-4" />
                {queueLength > 1 && (
                  <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground ltr-nums">
                    {queueLength}
                  </span>
                )}
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
