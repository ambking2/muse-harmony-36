import { Link } from "@tanstack/react-router";

import type { FeaturedPlaylist } from "@/lib/featured";
import { TILE_CLASS, tileFor } from "@/lib/tile";
import { cn } from "@/lib/utils";

/**
 * A collection tile — square artwork over a title and a one-line description,
 * the shape a music app's browse screen is built from.
 *
 * The tile is one link: the whole card is the tap target, artwork included, so
 * there is no guessing where to touch. Callers size it: a grid cell passes
 * nothing, a horizontal rail passes a fixed width.
 */
export function PlaylistCard({
  playlist,
  className,
}: {
  playlist: FeaturedPlaylist;
  className?: string;
}) {
  return (
    <Link
      to="/mix/$id"
      params={{ id: playlist.id }}
      className={cn("panel press block overflow-hidden text-right", className)}
    >
      <div
        className={cn(
          "media-tile grid place-items-center text-5xl",
          TILE_CLASS[tileFor(playlist.id)],
        )}
      >
        <span aria-hidden>{playlist.emoji}</span>
      </div>
      <div className="p-3">
        <div className="type-headline truncate">{playlist.title}</div>
        <p className="type-footnote mt-1 line-clamp-2 text-ios-label-secondary">{playlist.blurb}</p>
      </div>
    </Link>
  );
}
