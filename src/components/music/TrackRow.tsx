import { MoreHorizontal, Play, Pause, Download } from "lucide-react";
import type { Track } from "@/lib/types";
import { trackKey } from "@/lib/types";
import { Artwork } from "./Artwork";
import { usePlayer } from "@/stores/player";
import { cn } from "@/lib/utils";
import { TrackMenu } from "./TrackMenu";
import { Equalizer } from "../player/QueueSheet";
import { useLibrary } from "@/stores/library";

const SOURCE_LABEL: Record<Track["source"], string> = {
  netease: "نت‌ایس",
  kuwo: "کوئو",
  joox: "جواکس",
};

export function TrackRow({
  track,
  list,
  index,
  showIndex = false,
  compact = false,
  showSource = false,
}: {
  track: Track;
  list?: Track[];
  index?: number;
  showIndex?: boolean;
  compact?: boolean;
  showSource?: boolean;
}) {
  const current = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const downloads = useLibrary((s) => s.downloads);

  const active = !!current && trackKey(current) === trackKey(track);
  const downloaded = downloads.some(
    (d) => d.id.startsWith(`${trackKey(track)}:`) && d.status === "done",
  );

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
        aria-label={active ? "توقف" : "پخش"}
      >
        {showIndex && !active ? (
          <div
            className={cn(
              "flex items-center justify-center text-sm tabular-nums text-muted-foreground",
              compact ? "size-10" : "size-12",
            )}
          >
            {(index ?? 0) + 1}
          </div>
        ) : (
          <Artwork
            track={track}
            size={100}
            className={compact ? "size-10" : "size-12"}
            rounded="rounded-lg"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition group-hover:opacity-100">
          {active && isPlaying ? (
            <Pause className="size-4 text-white" />
          ) : (
            <Play className="size-4 text-white" />
          )}
        </div>
        {active && isPlaying && (
          <div className="absolute -bottom-1 -left-1 rounded-full bg-background/80 p-0.5">
            <Equalizer playing />
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => (active ? togglePlay() : playTrack(track, list ?? [track]))}
        className="min-w-0 flex-1 text-right"
      >
        <div
          className={cn(
            "flex items-center gap-1.5 truncate text-sm font-medium",
            active ? "text-primary" : "text-foreground",
          )}
        >
          <span className="truncate">{track.name}</span>
          {downloaded && <Download className="size-3 shrink-0 text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span className="truncate">{track.artist.join("، ")}</span>
          {showSource && (
            <>
              <span aria-hidden>·</span>
              <span className="shrink-0 opacity-70">{SOURCE_LABEL[track.source]}</span>
            </>
          )}
          {track.album && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate opacity-70">{track.album}</span>
            </>
          )}
        </div>
      </button>

      <TrackMenu track={track}>
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
          aria-label="گزینه‌های بیشتر"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </TrackMenu>
    </div>
  );
}
