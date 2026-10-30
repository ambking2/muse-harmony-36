import { AnimatePresence, motion } from "framer-motion";
import { Heart, Pause, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Glass } from "glisse";

import { getPicUrl, picKey } from "@/lib/gdmusic";
import { crossfade, morph, snappy, swapIcon, swapLine } from "@/lib/design/motion";
import { floatUp, iconPop } from "@/lib/design/motion-gsap";
import { useMagnetic } from "@/hooks/use-motion";
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
 * It is also the part of the app that changes the most often, so every swap is
 * animated rather than swapped: the artwork cross-dissolves, the title slides
 * up into its place, the play glyph morphs. A bar that flickers between two
 * tracks feels like a glitch; one that turns into the next track feels like a
 * player.
 *
 * The progress line is driven with `scaleX`, not `width` — a width change
 * re-runs layout on every tick, and this line ticks four times a second for the
 * length of a song.
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
  const togglePlay = usePlayer((state) => state.togglePlay);
  const favorites = useLibrary((state) => state.favorites);
  const toggleFavorite = useLibrary((state) => state.toggleFavorite);

  const key = track ? trackKey(track) : "";
  const isFavorite = !!key && favorites.includes(key);
  const playRef = useMagnetic<HTMLButtonElement>();

  const pic = useQuery({
    queryKey: picKey(track?.source ?? "", track?.pic_id ?? "", 128),
    enabled: !!track && !track.picUrl,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 128),
  });

  const art = track?.picUrl ?? pic.data;

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={morph}
          className="fixed inset-x-0 bottom-[calc(var(--tabbar-inset)+0.5rem)] z-40 px-3"
        >
          <Glass className="muis-glisse-mini-player material lens specular dock-hero relative mx-auto flex w-[min(100%,30rem)] items-center gap-1 overflow-hidden rounded-[2.25rem] border border-ios-separator p-1.5 shadow-[var(--floating-shadow)]">
            <Link
              to="/now-playing"
              className="press relative flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-tile ps-1 pe-2"
              aria-label={`در حال پخش: ${track.name}`}
            >
              {/* Shared with the full player: the same album, the same object,
                  carried from here into the large artwork rather than cut. */}
              <motion.span
                layoutId={`artwork-${key}`}
                transition={morph}
                className={cn(
                  "size-11 shrink-0 overflow-hidden rounded-tile bg-ios-fill",
                  isBuffering && "animate-pulse",
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {art && (
                    <motion.img
                      key={art}
                      src={art}
                      alt=""
                      decoding="async"
                      initial={{ opacity: 0, scale: 1.08 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={crossfade}
                      className="size-full object-cover"
                    />
                  )}
                </AnimatePresence>
              </motion.span>

              <span className="relative min-w-0 flex-1 overflow-hidden text-right">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`name-${key}`}
                    variants={swapLine}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={cn(
                      "type-subheadline block truncate font-semibold",
                      isFavorite && "text-ios-tint",
                    )}
                  >
                    {track.name}
                  </motion.span>
                </AnimatePresence>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`artist-${key}`}
                    variants={swapLine}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="type-footnote block truncate text-ios-label-secondary"
                  >
                    {track.artist.join("، ")}
                  </motion.span>
                </AnimatePresence>
              </span>
            </Link>

            <motion.button
              type="button"
              onClick={(event) => {
                // Rapport's reward pair: the icon snaps in and a badge floats
                // off the action — only when something was added, never when
                // it was taken away.
                if (!isFavorite) {
                  floatUp(event.currentTarget, "به علاقه‌مندی‌ها اضافه شد");
                  iconPop(event.currentTarget);
                }
                toggleFavorite(track);
              }}
              aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              aria-pressed={isFavorite}
              whileTap={{ scale: 0.88 }}
              transition={snappy}
              className={cn(
                "press relative grid size-11 shrink-0 place-items-center rounded-lg text-ios-label-secondary",
                isFavorite && "text-ios-tint",
              )}
            >
              <motion.span
                animate={{ scale: isFavorite ? [1, 1.28, 1] : 1 }}
                transition={snappy}
                className="flex"
              >
                <Heart className={cn("size-5", isFavorite && "fill-current")} strokeWidth={1.8} />
              </motion.span>
            </motion.button>

            <motion.button
              type="button"
              ref={playRef}
              onClick={() => togglePlay()}
              aria-label={isPlaying ? "توقف" : "پخش"}
              whileTap={{ scale: 0.9 }}
              transition={snappy}
              className="press relative grid size-11 shrink-0 place-items-center rounded-lg bg-ios-tint text-white"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isPlaying ? "pause" : "play"}
                  variants={swapIcon}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex"
                >
                  {isPlaying ? (
                    <Pause className="size-5 fill-current" strokeWidth={0} />
                  ) : (
                    <Play className="size-5 translate-x-px fill-current" strokeWidth={0} />
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {/* How far along the track is — iOS draws this as a hairline along
                the bottom edge of the bar, filling from the reading edge.
                `scaleX` from the inline start, so it costs no layout. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-ios-label/25">
              <MiniPlayerProgress />
            </div>
          </Glass>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


/* The audio clock updates several times per second. Keep that subscription in
   this tiny leaf so the artwork, buttons, query and animated labels do not
   re-render on every progress tick. */
function MiniPlayerProgress() {
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <motion.div
      className="h-full origin-left bg-ios-tint"
      style={{ scaleX: progress }}
    />
  );
}
