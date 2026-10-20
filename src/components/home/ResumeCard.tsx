import { motion } from "framer-motion";
import { Pause, Play, Shuffle } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Artwork } from "@/components/music/Artwork";
import { useMounted } from "@/hooks/use-mounted";
import { standard } from "@/lib/design/motion";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import type { Track } from "@/lib/types";
import { resolveTrackForPlayback } from "@/lib/download";

/**
 * The continue-listening card at the top of home.
 *
 * Shows whatever is loaded in the player right now, or — when nothing is —
 * the most recent thing played, which is the closest honest answer to "carry on
 * where you left off". The tint comes from the artwork, so the card changes
 * colour with the music.
 */
export function ResumeCard() {
  const current = usePlayer((state) => state.queue[state.index]);
  const queueLength = usePlayer((state) => state.queue.length);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const togglePlay = usePlayer((state) => state.togglePlay);
  const playTrack = usePlayer((state) => state.playTrack);
  const history = useLibrary((state) => state.history);
  const tracksById = useLibrary((state) => state.tracksById);
  const mounted = useMounted();

  // The player has the answer whenever it has something; otherwise the newest
  // history entry that still resolves to a track.
  let resume: Track | undefined = current;
  if (!resume) {
    const latest = history.find((entry) => tracksById[entry.key]);
    resume = latest ? tracksById[latest.key] : undefined;
  }

  if (!resume) return null;

  const isCurrent = resume === current;
  const playing = isCurrent && isPlaying;

  return (
    <motion.section
      initial={mounted ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={standard}
      className="relative mb-8 overflow-hidden rounded-card"
      style={{
        background:
          "linear-gradient(140deg, color-mix(in oklch, var(--track-accent) 55%, transparent), transparent 65%)",
      }}
    >
      <div className="rounded-card border border-ios-separator bg-ios-surface/70 p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Link
            to="/now-playing"
            className="press shrink-0"
            aria-label={`باز کردن پخش‌کننده: ${resume.name}`}
          >
            <Artwork track={resume} size={200} className="size-20" rounded="media-tile" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="type-footnote text-ios-label-secondary">
              {queueLength > 1
                ? `ادامه‌ی پخش · ${queueLength.toLocaleString("fa-IR")} آهنگ در صف`
                : "ادامه‌ی پخش"}
            </p>
            <Link
              to="/now-playing"
              className="type-title-3 mt-0.5 block truncate transition-opacity hover:opacity-80"
            >
              {resume.name}
            </Link>
            <p className="type-subheadline truncate text-ios-label-secondary">
              {resume.artist.join("، ")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (isCurrent) togglePlay();
              else {
                const playable = resolveTrackForPlayback(resume!);
                playTrack(playable, [playable]);
              }
            }}
            className="btn btn-filled flex-1"
          >
            {playing ? (
              <Pause className="size-4 fill-current" strokeWidth={0} />
            ) : (
              <Play className="size-4 fill-current" strokeWidth={0} />
            )}
            {playing ? "توقف" : "پخش"}
          </button>
          <button
            type="button"
            onClick={() => {
              const playable = resolveTrackForPlayback(resume!);
              playTrack(playable, [playable]);
            }}
            aria-label="پخش از اول"
            className="btn btn-gray"
          >
            <Shuffle className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
