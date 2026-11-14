import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ListMusic, Play } from "lucide-react";
import { useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { QuickLinks } from "@/components/home/QuickLinks";
import { ResumeCard } from "@/components/home/ResumeCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { Artwork } from "@/components/music/Artwork";
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
  return (
    <AppShell>
      <HomeMotionStage />
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
/**
 * Scroll-reactive, homepage-only ice-glass intro.
 */
function HomeMotionStage() {
  const stage = useRef<HTMLElement>(null);
  const current = usePlayer((state) => state.queue[state.index]);
  const playing = usePlayer((state) => state.isPlaying);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start start", "end start"] });
  const ringY = useTransform(scrollYProgress, [0, 1], [0, -105]);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [-8, 42]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 55]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 1, 0.15]);

  return (
    <section ref={stage} className="home-motion-stage" aria-label="معرفی موسی">
      <div className="home-stage-copy">
        <span className="home-stage-kicker"><span className="home-stage-dot" /> MUSE HARMONY · YOUR SOUNDSPACE</span>
        <motion.div style={{ y: copyY, opacity: copyOpacity }}>
          <h2 className="home-stage-title">موسیقی،<br /><em>در جریان.</em></h2>
          <p className="home-stage-description">از جایی که رها کردی، ادامه بده.</p>
        </motion.div>
      </div>
      <motion.div className="home-stage-orbit" style={{ y: ringY, rotate: ringRotate }} aria-hidden="true">
        <div className="home-orbit-ring home-orbit-ring-a" />
        <div className="home-orbit-ring home-orbit-ring-b" />
        <div className="home-orbit-ring home-orbit-ring-c" />
        <div className="home-orbit-glow" />
        <div className={`home-orbit-core ${playing ? "is-playing" : ""}`}>
          {current ? <Artwork track={current} size={480} className="home-orbit-cover" rounded="rounded-full" /> : <div className="home-orbit-placeholder"><span>♪</span></div>}
        </div>
        <span className="home-orbit-node home-orbit-node-one" />
        <span className="home-orbit-node home-orbit-node-two" />
        <span className="home-orbit-node home-orbit-node-three" />
      </motion.div>
      <div className="home-stage-index"><span>01</span><span>LISTEN / REPEAT</span></div>
      <div className="home-stage-scroll"><span /> اسکرول کن</div>
    </section>
  );
}

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
    <Rail title="پلی‌لیست‌های ایرانی" icon={ListMusic}>
      {FEATURED_PLAYLISTS.map((playlist) => (
        <PlaylistCard key={playlist.id} playlist={playlist} className="w-52 shrink-0" />
      ))}
    </Rail>
  );
}
