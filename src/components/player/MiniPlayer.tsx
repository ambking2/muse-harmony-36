import { Link } from "@tanstack/react-router";
import { Pause, Play, SkipForward, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { getPicUrl } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MiniPlayer() {
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);

  const key = track ? trackKey(track) : "";
  const isFav = key && favorites.includes(key);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const pic = useQuery({
    queryKey: ["pic", key, "200"],
    enabled: !!track,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 200),
  });

  return (
    <AnimatePresence>
      {track ? (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex justify-center px-3"
        >
          <Link
            to="/now-playing"
            className="glass-strong pointer-events-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-white/10 p-2 shadow-xl"
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
              {pic.data ? (
                <img src={pic.data} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{track.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {track.artist.join(", ")}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleFavorite(track);
              }}
              className={cn(
                "hidden size-9 items-center justify-center rounded-full text-muted-foreground transition sm:flex",
                isFav && "text-primary",
              )}
              aria-label="Favorite"
            >
              <Heart className={cn("size-5", isFav && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                togglePlay();
              }}
              className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 pl-0.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                next();
              }}
              className="mr-1 flex size-9 items-center justify-center rounded-full text-foreground transition"
              aria-label="Next"
            >
              <SkipForward className="size-5" />
            </button>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </Link>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}