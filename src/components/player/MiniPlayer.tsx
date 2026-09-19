import { Link } from "@tanstack/react-router";
import { Pause, Play, SkipForward, SkipBack, Heart, LoaderCircle, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { Artwork } from "@/components/music/Artwork";
import { formatTime } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MiniPlayer() {
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
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const reducedMotion = useReducedMotion();
  const isFav = !!track && favorites.includes(trackKey(track));
  const progress = duration > 0 ? Math.min(100, Math.max(0, currentTime / duration * 100)) : 0;

  return (
    <AnimatePresence>
      {track && (
        <motion.section aria-label="Music player" initial={{ y: reducedMotion ? 0 : 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="mini-player-position">
          <div className="glass-strong relative overflow-hidden rounded-[1.75rem] p-2.5 lg:px-4 lg:py-3">
            <div className="flex items-center gap-2 lg:gap-4">
              <Link to="/now-playing" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl" aria-label={`Open player: ${track.name}`}>
                <Artwork track={track} size={200} className="size-12 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{track.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{error ? "Playback unavailable" : isBuffering ? "Loading audio…" : track.artist.join(", ")}</p>
                </div>
              </Link>
              <button type="button" onClick={() => toggleFavorite(track)} aria-label={isFav ? "Remove from favorites" : "Add to favorites"} aria-pressed={isFav} className={cn("icon-button hidden sm:inline-flex", isFav ? "text-primary" : "text-muted-foreground")}><Heart aria-hidden="true" className={cn("size-5", isFav && "fill-current")} /></button>
              <button type="button" onClick={prev} aria-label="Previous track" className="icon-button hidden lg:inline-flex"><SkipBack aria-hidden="true" className="size-5" /></button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="icon-button bg-primary text-primary-foreground hover:bg-primary/90">
                {isBuffering && isPlaying ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : isPlaying ? <Pause aria-hidden="true" className="size-5 fill-current" /> : <Play aria-hidden="true" className="size-5 fill-current" />}
              </button>
              <button type="button" onClick={next} aria-label="Next track" className="icon-button"><SkipForward aria-hidden="true" className="size-5" /></button>
              <div className="hidden items-center gap-1 border-l border-white/10 pl-3 xl:flex">
                <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="icon-button text-muted-foreground">{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button>
                <input type="range" aria-label="Volume" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(event) => setVolume(Number(event.target.value))} className="h-6 w-20 accent-primary" />
              </div>
            </div>
            <div className="mt-2 hidden items-center gap-3 lg:flex">
              <span className="text-[10px] tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
              <input type="range" aria-label="Playback position" min={0} max={Math.max(duration, 1)} step={0.5} disabled={!duration} value={Math.min(currentTime, duration)} onChange={(event) => seek(Number(event.target.value))} className="h-5 min-w-0 flex-1 accent-primary" />
              <span className="text-[10px] tabular-nums text-muted-foreground">{formatTime(duration)}</span>
            </div>
            <div aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden bg-white/5 lg:hidden"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
