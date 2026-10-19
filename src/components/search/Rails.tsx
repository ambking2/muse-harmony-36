import { useQuery } from "@tanstack/react-query";
import { ListMusic, Mic2, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { PlaylistCard } from "@/components/music/PlaylistCard";
import { getPicUrl, picKey, searchSmart } from "@/lib/gdmusic";
import { FEATURED_PLAYLISTS } from "@/lib/featured";
import type { Track } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The horizontal rails on the search screen.
 *
 * A rail is the one place a music app scrolls sideways: enough items to feel
 * like a shelf, each one a fixed-width card so the row peeks and invites the
 * next swipe instead of stopping dead at the edge.
 */

/** Thumbnails that resolve themselves, shared by every rail. */
export function TrackThumb({
  track,
  className = "size-12 rounded-lg",
}: {
  track: Track;
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: picKey(track.source, track.pic_id, 200),
    enabled: !!track.pic_id,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track.source, track.pic_id, 200),
  });

  return data ? (
    // A results page can show dozens of these at once; without lazy loading the
    // browser starts every thumbnail the moment the markup arrives, competing
    // with the JS and fonts for the same connection.
    <img
      src={data}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 bg-ios-fill object-cover", className)}
    />
  ) : (
    <div className={cn("skeleton shrink-0", className)} />
  );
}

/** A titled shelf of cards, with an optional trailing link in the title row. */
export function Rail({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="type-footnote text-ios-label-secondary">{title}</h2>
        {action}
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">{children}</div>
    </section>
  );
}

/** Curated search terms, each card previewing the first result it would find. */
export function LaneRail({
  lanes,
  onPick,
}: {
  lanes: readonly { title: string; query: string; emoji: string }[];
  onPick: (query: string) => void;
}) {
  return (
    <Rail title="حالا این‌ها را گوش کنید" icon={Mic2}>
      {lanes.map((lane) => (
        <LaneCard key={lane.query} lane={lane} onPick={onPick} />
      ))}
    </Rail>
  );
}

function LaneCard({
  lane,
  onPick,
}: {
  lane: { title: string; query: string; emoji: string };
  onPick: (query: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["lane", lane.query],
    staleTime: 30 * 60_000,
    queryFn: () => searchSmart(lane.query, { count: 6 }),
  });

  return (
    <button
      type="button"
      onClick={() => onPick(lane.query)}
      className="panel press w-44 shrink-0 overflow-hidden text-right"
    >
      <div className="media-tile relative">
        {data?.[0] ? (
          <TrackThumb track={data[0]} className="size-full rounded-none" />
        ) : (
          <div className="skeleton size-full" />
        )}
        <span className="absolute bottom-2 right-2 text-2xl drop-shadow" aria-hidden>
          {lane.emoji}
        </span>
      </div>
      <div className="p-3">
        <div className="type-headline truncate">{lane.title}</div>
        <div className="type-footnote truncate text-ios-label-secondary">
          {data?.length ? `${data.length.toLocaleString("fa-IR")} آهنگ` : "در حال بارگذاری…"}
        </div>
      </div>
    </button>
  );
}

/**
 * Hand-curated Iranian collections. Search can find an artist but never the
 * album or playlist around them, so this is the only shelf that surfaces music
 * the user did not have to think to ask for.
 */
export function CollectionRail() {
  return (
    <Rail title="پلی‌لیست‌های ایرانی" icon={ListMusic}>
      {FEATURED_PLAYLISTS.map((playlist) => (
        <PlaylistCard key={playlist.id} playlist={playlist} className="w-52 shrink-0" />
      ))}
    </Rail>
  );
}

/** Artists or albums found in the current search, as a shelf of thumbnails. */
export function EntityRail({
  title,
  base,
  items,
}: {
  title: string;
  /** Route prefix, with the name appended and escaped. */
  base: string;
  items: readonly (readonly [string, Track])[];
}) {
  return (
    <Rail title={title} icon={base.includes("artist") ? Mic2 : ListMusic}>
      {items.map(([name, track]) => (
        <Link
          key={name}
          to={`${base}/${encodeURIComponent(name)}` as string}
          className="press flex w-48 shrink-0 items-center gap-3 panel flex items-center gap-2 p-2"
        >
          <TrackThumb track={track} />
          <span className="min-w-0">
            <span className="type-subheadline block truncate">{name}</span>
            <span className="type-footnote block truncate text-ios-label-secondary">
              {track.artist.join("، ")}
            </span>
          </span>
        </Link>
      ))}
    </Rail>
  );
}
