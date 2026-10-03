import { Download, MoreHorizontal } from "lucide-react";

import type { Track } from "@/lib/types";
import { trackKey } from "@/lib/types";
import { Artwork } from "./Artwork";
import { usePlayer } from "@/stores/player";
import { cn } from "@/lib/utils";
import { TrackMenuLazy } from "./TrackMenuLazy";
import { Equalizer } from "../player/QueueSheet";
import { useLibrary } from "@/stores/library";

/**
 * One track in a list.
 *
 * Shaped like a native music list row: 48pt artwork, the title over the artist,
 * and a trailing control — the position number while nothing is playing, the
 * playing indicator on the current track, and the overflow menu beside it.
 *
 * Each track floats on its own, so a long queue reads as a stack of cards and
 * the blurred artwork shows between them rather than through one long slab.
 *
 * The row itself is the tap target and the overflow menu is a sibling, never a
 * button inside one: nested interactive elements cannot be focused or reached
 * by assistive tech, and the inner one swallows the outer's press.
 */
export function TrackRow({
  track,
  list,
  index,
  showIndex = false,
  compact = false,
}: {
  track: Track;
  /** The full queue to hand the player, so next/prev work from this list. */
  list?: Track[];
  index?: number;
  /** Replace the artwork with a position number until the row is current. */
  showIndex?: boolean;
  compact?: boolean;
}) {
  const current = usePlayer((state) => state.queue[state.index]);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const playTrack = usePlayer((state) => state.playTrack);
  const togglePlay = usePlayer((state) => state.togglePlay);
  const downloads = useLibrary((state) => state.downloads);

  const active = !!current && trackKey(current) === trackKey(track);
  const downloaded = downloads.some(
    (entry) => entry.id.startsWith(`${trackKey(track)}:`) && entry.status === "done",
  );

  const toggle = () => {
    if (active) togglePlay();
    else playTrack(track, list ?? [track]);
  };

  const label = active
    ? isPlaying
      ? `توقف ${track.name}`
      : `پخش ${track.name}`
    : `${(index ?? 0) + 1}. ${track.name} — ${track.artist.join("، ")}`;

  return (
    <div className="panel flex items-center gap-1 pr-1 pl-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className="press flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-card ps-1 text-right hover:bg-ios-fill-soft active:bg-ios-fill"
      >
        {showIndex && !active ? (
          <span
            className={cn(
              "type-body grid shrink-0 place-items-center tabular-nums text-ios-label-tertiary",
              compact ? "size-10" : "size-12",
            )}
          >
            {(index ?? 0) + 1}
          </span>
        ) : (
          <Artwork
            track={track}
            size={96}
            className={cn("shrink-0", compact ? "size-10" : "size-12")}
            rounded="rounded-lg"
          />
        )}

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "type-body flex items-center gap-1.5 truncate",
              active ? "font-semibold text-ios-tint" : "text-ios-label",
            )}
          >
            <span className="truncate">{track.name}</span>
            {downloaded && (
              <Download className="size-3.5 shrink-0 text-ios-label-tertiary" aria-hidden />
            )}
          </span>
          <span className="type-subheadline flex items-center gap-1.5 truncate text-ios-label-secondary">
            <span className="truncate">{track.artist.join("، ")}</span>
            {track.album && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{track.album}</span>
              </>
            )}
          </span>
        </span>

        {active && (
          <span className="shrink-0 text-ios-tint [&_span]:bg-current" aria-hidden>
            <Equalizer playing={isPlaying} />
          </span>
        )}
      </button>

      <TrackMenuLazy track={track}>
        <button
          type="button"
          className="press grid size-11 shrink-0 place-items-center rounded-card text-ios-label-secondary hover:bg-ios-fill-soft"
          aria-label={`گزینه‌های بیشتر برای ${track.name}`}
        >
          <MoreHorizontal className="size-5" strokeWidth={2} />
        </button>
      </TrackMenuLazy>
    </div>
  );
}
