import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Play } from "lucide-react";
import { useMemo } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { QuickLinks } from "@/components/home/QuickLinks";
import { ResumeCard } from "@/components/home/ResumeCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { Rail, TrackThumb } from "@/components/search/Rails";
import { FEATURED_PLAYLISTS } from "@/lib/featured";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Home, the way a music app's first screen is built everywhere: one hero that
 * says "carry on", then a shelf of small artwork you can start with a tap, the
 * editorial collections as big cards, and at the bottom the doors to the rest
 * of the library. The eyebrow is the date — the cheapest line that says today
 * is real. Search is not on this screen; it lives in the circular button
 * beside the dock, where the finger already is.
 */
function Home() {
  // «شنبه ۲۷ مهر» — the long Persian date.
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );

  return (
    <AppShell>
      <Screen title="خانه" subtitle={today}>
        <ResumeCard />
        <RecentRail />
        <FavoritesRail />
        <Collections />
        <QuickLinks />
      </Screen>
    </AppShell>
  );
}

/**
 * Jump back in, as a shelf of square artwork.
 *
 * Spotify's home rail and YouTube Music's quick picks agree on this much: what
 * you actually played belongs nearest the top, and each tile starts the music
 * on the tap itself — no detour through a detail screen first.
 */
function RecentRail() {
  const history = useLibrary((state) => state.history);
  const tracksById = useLibrary((state) => state.tracksById);
  const playTrack = usePlayer((state) => state.playTrack);

  // Newest first, deduplicated, enough to fill a shelf.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Track[] = [];
    for (const entry of history) {
      if (seen.has(entry.key)) continue;
      const track = tracksById[entry.key];
      if (!track) continue;
      seen.add(entry.key);
      out.push(track);
      if (out.length >= 10) break;
    }
    return out;
  }, [history, tracksById]);

  if (!recent.length) return null;

  return (
    <Rail title="پخش اخیر" icon={Play}>
      {recent.map((track) => (
        <RecentTile key={trackKey(track)} track={track} list={recent} onPlay={playTrack} />
      ))}
    </Rail>
  );
}

function RecentTile({
  track,
  list,
  onPlay,
}: {
  track: Track;
  list: Track[];
  onPlay: (track: Track, queue: Track[]) => void;
}) {
  return (
    <div className="w-28 shrink-0">
      <button
        type="button"
        onClick={() => onPlay(track, list)}
        aria-label={`پخش ${track.name}`}
        className="press relative block w-full"
      >
        <TrackThumb track={track} className="aspect-square w-full rounded-2xl" />
        <span className="absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <Play className="size-4 fill-current" strokeWidth={0} />
        </span>
      </button>
      <div className="type-footnote mt-1.5 truncate font-medium">{track.name}</div>
      <div className="type-caption truncate text-ios-label-secondary">
        {track.artist.join("، ")}
      </div>
    </div>
  );
}

/**
 * The favourites shelf, when there is one.
 *
 * The dock no longer carries a favourites tab, so home carries the shelf: the
 * same square-artwork rail as recent plays, and the full list stays one tap
 * away behind the «همه» link.
 */
function FavoritesRail() {
  const favorites = useLibrary((state) => state.favorites);
  const tracksById = useLibrary((state) => state.tracksById);
  const playTrack = usePlayer((state) => state.playTrack);

  const liked = useMemo(
    () => favorites.map((key) => tracksById[key]).filter((t): t is Track => Boolean(t)),
    [favorites, tracksById],
  );

  if (!liked.length) return null;

  return (
    <Rail
      title="علاقه‌مندی‌ها"
      icon={Heart}
      action={
        <Link to="/favorites" className="type-footnote text-ios-tint">
          همه
        </Link>
      }
    >
      {liked.slice(0, 9).map((track) => (
        <RecentTile key={trackKey(track)} track={track} list={liked} onPlay={playTrack} />
      ))}
    </Rail>
  );
}

/** The provider's own hand-picked Iranian collections. Local copy, so this
 *  section costs no network calls at all. */
function Collections() {
  return (
    <Section
      title="پلی‌لیست‌های ایرانی"
      action={
        <Link to="/explore" className="type-footnote text-ios-tint">
          همه
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
        {FEATURED_PLAYLISTS.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </Section>
  );
}
