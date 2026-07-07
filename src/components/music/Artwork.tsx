import { useQuery } from "@tanstack/react-query";
import { getPicUrl } from "@/lib/gdmusic";
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
    queryKey: ["pic", track?.source, track?.pic_id, String(size)],
    enabled: !!track?.pic_id,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, size),
  });
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-muted to-secondary",
        rounded,
        className,
      )}
    >
      {q.data ? (
        <img
          src={q.data}
          alt={track?.name ?? ""}
          loading="lazy"
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="skeleton size-full" />
      )}
    </div>
  );
}