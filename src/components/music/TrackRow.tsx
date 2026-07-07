import { MoreHorizontal, Play, Pause } from "lucide-react";
import type { Track } from "@/lib/types";
import { trackKey } from "@/lib/types";
import { Artwork } from "./Artwork";
import { usePlayer } from "@/stores/player";
import { cn } from "@/lib/utils";
import { TrackMenu } from "./TrackMenu";

export function TrackRow({
  track,
  list,
  index,
  showIndex = false,
  compact = false,
}: {
  track: Track;
  list?: Track[];
  index?: number;
  showIndex?: boolean;
  compact?: boolean;
}) {
  const current = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const togglePlay = usePlayer((s) => s.togglePlay);

  const active = current && trackKey(current) === trackKey(track);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5",
        active && "bg-white/5",
      )}
    >
      <button
        type="button"
        onClick={() => (active ? togglePlay() : playTrack(track, list ?? [track]))}
        className="relative shrink-0"
        aria-label="Play"
      >
        {showIndex && !active ? (
          <div className={cn(
            "flex items-center justify-center text-sm tabular-nums text-muted-foreground",
            compact ? "size-10" : "size-12",
          )}>
            {(index ?? 0) + 1}
          </div>
        ) : (
          <Artwork track={track} size={100} className={compact ? "size-10" : "size-12"} rounded="rounded-lg" />
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition group-hover:opacity-100">
          {active && isPlaying ? <Pause className="size-4 text-white" /> : <Play className="size-4 text-white" />}
        </div>
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-sm font-medium",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {track.name}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {track.artist.join(", ")} {track.album ? `• ${track.album}` : ""}
        </div>
      </div>
      <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
        {track.source}
      </span>
      <TrackMenu track={track}>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-white/10 hover:text-foreground group-hover:opacity-100"
          aria-label="More"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </TrackMenu>
    </div>
  );
}