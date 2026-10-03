import { useQuery } from "@tanstack/react-query";
import { getPicUrl, picKey } from "@/lib/gdmusic";
import { TILE_CLASS, tileFor } from "@/lib/tile";
import type { Track } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Artwork({
  track,
  size = 300,
  className,
  rounded = "rounded-xl",
}: {
  track: Pick<Track, "source" | "pic_id" | "name"> | undefined;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const q = useQuery({
    queryKey: picKey(track?.source ?? "", track?.pic_id ?? "", size),
    enabled: !!track?.pic_id,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, size),
  });
  // A square waiting on its cover is not a loading bar — it is a coloured
  // tile that the picture lands on top of, so the row never jumps and never
  // flashes grey while a slow cover URL resolves.
  const tile =
    TILE_CLASS[tileFor(track ? `${track.source}:${track.pic_id ?? track.name}` : undefined)];
  return (
    <div className={cn("relative overflow-hidden", tile, rounded, className)}>
      {q.data && (
        <img
          src={q.data}
          alt={track?.name ?? ""}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
