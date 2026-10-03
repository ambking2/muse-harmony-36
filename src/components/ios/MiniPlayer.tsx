import { AnimatePresence, motion } from "framer-motion";
import { Heart, Pause, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { getPicUrl, picKey } from "@/lib/gdmusic";
import { crossfade } from "@/lib/design/motion";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The mini player.
 *
 * Sits directly on top of the tab bar and follows the same width and material
 * as it, so the two read as one object rather than two floating panels. It
 * carries the three things iOS puts there: what is playing, how far along it
 * is (the hairline progress line along the bottom edge), and the controls.
 *
 * Controls are 44pt. The artwork and titles are the tap target into the full
 * player; play/pause and favourite are their own buttons, never nested inside
 * it — a button inside a button is not focusable and not reachable by
 * VoiceOver.
 */
export function MiniPlayer() {
  const track = usePlayer((state) => state.queue[state.index]);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const isBuffering = usePlayer((state) => state.isBuffering);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const togglePlay = usePlayer((state) => state.togglePlay);
  const favorites = useLibrary((state) => state.favorites);
  const toggleFavorite = useLibrary((state) => state.toggleFavorite);

  const key = track ? trackKey(track) : "";
  const isFavorite = !!key && favorites.includes(key);

  const pic = useQuery({
    queryKey: picKey(track?.source ?? "", track?.pic_id ?? "", 128),
    enabled: !!track && !track.picUrl,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 128),
  });

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={crossfade}
          className="fixed inset-x-0 bottom-[var(--tabbar-inset)] z-40 px-3"
        >
          <div className="material lens specular spotlight relative mx-auto flex w-[min(100%,30rem)] items-center gap-1 overflow-hidden rounded-card border border-ios-separator p-1.5 shadow-[var(--floating-shadow)]">
            {/* The live bend: an empty layer whose only job is to displace the
                frosted backdrop underneath. Falls back to a bent copy of the
                scene where the engine cannot filter a backdrop at all. */}
            <span className="lens-bend" aria-hidden />
            <span className="refract opacity-35" aria-hidden />
            <Link
              to="/now-playing"
              className="press relative flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-tile ps-1 pe-2"
              aria-label={`در حال پخش: ${track.name}`}
            >
              <span
                className={cn(
                  "size-11 shrink-0 overflow-hidden rounded-tile bg-ios-fill",
                  isBuffering && "animate-pulse",
                )}
              >
                {track.picUrl || pic.data ? (
                  <img
                    src={track.picUrl ?? pic.data ?? ""}
                    alt=""
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="skeleton block size-full" />
                )}
              </span>

              <span className="min-w-0 flex-1 text-right">
                <span
                  className={cn(
                    "type-subheadline block truncate font-semibold",
                    isFavorite && "text-ios-tint",
                  )}
                >
                  {track.name}
                </span>
                <span className="type-footnote block truncate text-ios-label-secondary">
                  {track.artist.join("، ")}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => toggleFavorite(track)}
              aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              aria-pressed={isFavorite}
              className={cn(
                "press relative grid size-11 shrink-0 place-items-center rounded-lg text-ios-label-secondary",
                isFavorite && "text-ios-tint",
              )}
            >
              <Heart className={cn("size-5", isFavorite && "fill-current")} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              onClick={() => togglePlay()}
              aria-label={isPlaying ? "توقف" : "پخش"}
              className="press relative grid size-11 shrink-0 place-items-center rounded-lg bg-ios-tint text-white"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" strokeWidth={0} />
              ) : (
                <Play className="size-5 translate-x-px fill-current" strokeWidth={0} />
              )}
            </button>

            {/* How far along the track is — iOS draws this as a hairline along
                the bottom edge of the bar, filling from the reading edge. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-ios-label/25">
              <div className="h-full bg-ios-tint" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
