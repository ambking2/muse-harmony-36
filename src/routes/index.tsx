import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import "@/home-motion.css";

import { AppShell } from "@/components/layout/AppShell";
import { QuickLinks } from "@/components/home/QuickLinks";
import { ResumeCard } from "@/components/home/ResumeCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { Artwork } from "@/components/music/Artwork";
import { TrackThumb } from "@/components/search/Rails";
import { useMounted } from "@/hooks/use-mounted";
import { FEATURED_PLAYLISTS } from "@/lib/featured";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Home: one scroll-driven story. A pale ice-glass hero with a suspended ring,
 * then the same shelves the old home had — continue, recent, favourites,
 * playlists, library — each as a numbered chapter whose rule, title and shelf
 * are bound to scroll position (so reverse scrolling plays them backwards).
 * No long copy: every chapter is just its heading and the real content.
 */
function Home() {
  return (
    <AppShell>
      <HomeExperience />
    </AppShell>
  );
}

type ChapterId = "resume" | "recent" | "favorites" | "playlists" | "library";
type Chapter = { id: ChapterId; en: string; title: string };

function scrollToId(id: string, reduce: boolean) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function HomeExperience() {
  const reduce = !!useReducedMotion();
  const mounted = useMounted();
  const current = usePlayer((state) => state.queue[state.index]);
  const history = useLibrary((state) => state.history);
  const favorites = useLibrary((state) => state.favorites);
  const tracksById = useLibrary((state) => state.tracksById);

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

  const liked = useMemo(
    () => favorites.map((key) => tracksById[key]).filter((t): t is Track => Boolean(t)),
    [favorites, tracksById],
  );

  const hasResume = Boolean(current) || history.some((entry) => tracksById[entry.key]);

  // Library state is client-only; before mount only the always-present chapters
  // render, so server and client markup agree.
  const chapters = useMemo<Chapter[]>(() => {
    const list: Chapter[] = [];
    if (mounted && hasResume) list.push({ id: "resume", en: "CONTINUE", title: "ادامه‌ی پخش" });
    if (mounted && recent.length) list.push({ id: "recent", en: "RECENT", title: "پخش‌های اخیر" });
    if (mounted && liked.length)
      list.push({ id: "favorites", en: "FAVORITES", title: "علاقه‌مندی‌ها" });
    list.push({ id: "playlists", en: "PLAYLISTS", title: "پلی‌لیست‌ها" });
    list.push({ id: "library", en: "LIBRARY", title: "کتابخانه" });
    return list;
  }, [mounted, hasResume, recent.length, liked.length]);

  return (
    <div className={`wm-page${reduce ? " wm-reduced" : ""}`}>
      <RingLayer reduce={reduce} track={mounted ? current : undefined} />
      <ChapterNav chapters={chapters} reduce={reduce} />
      <Hero
        reduce={reduce}
        onStart={() => scrollToId(`wm-${chapters[0].id}`, reduce)}
      />

      {chapters.map((chapter, index) => (
        <ChapterSection
          key={chapter.id}
          id={`wm-${chapter.id}`}
          no={String(index + 1).padStart(2, "0")}
          en={chapter.en}
          title={chapter.title}
          reduce={reduce}
          action={
            chapter.id === "favorites" ? (
              <Link to="/favorites" className="wm-link">
                همه <ArrowLeft className="size-4" aria-hidden />
              </Link>
            ) : undefined
          }
        >
          {chapter.id === "resume" && (
            <div className="wm-resume">
              <ResumeCard />
            </div>
          )}
          {chapter.id === "recent" && <TrackShelf tracks={recent} />}
          {chapter.id === "favorites" && <TrackShelf tracks={liked.slice(0, 9)} />}
          {chapter.id === "playlists" && (
            <Shelf>
              {FEATURED_PLAYLISTS.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} className="w-52 shrink-0" />
              ))}
            </Shelf>
          )}
          {chapter.id === "library" && (
            <div className="wm-library">
              <QuickLinks />
            </div>
          )}
        </ChapterSection>
      ))}
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

function Hero({ reduce, onStart }: { reduce: boolean; onStart: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0.1]);
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { y: "115%" },
          animate: { y: 0 },
          transition: { duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1] as const },
        };

  return (
    <section id="wm-hero" ref={ref} className="wm-hero" aria-label="معرفی موسی">
      <span className="wm-kicker">
        <i className="wm-dot" /> MUSE HARMONY · YOUR SOUNDSPACE
      </span>

      <motion.div style={reduce ? undefined : { y, opacity }}>
        <h1 className="wm-title">
          <span className="wm-line">
            <span className="word">
              <motion.span className="word-in" {...rise(0.05)}>
                موسیقی،
              </motion.span>
            </span>
          </span>
          <span className="wm-line">
            <span className="word">
              <motion.span className="word-in" {...rise(0.18)}>
                در
              </motion.span>
            </span>{" "}
            <span className="word">
              <motion.span className="word-in wm-hl" {...rise(0.3)}>
                جریان.
              </motion.span>
            </span>
          </span>
        </h1>
      </motion.div>

      <div className="wm-hero-foot">
        <span className="wm-index">
          <b>00</b> LISTEN / REPEAT
        </span>
        <button type="button" className="wm-cue" onClick={onStart}>
          اسکرول کن <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

/* ── The suspended ring: fixed behind the page, driven by scroll ─────── */

function RingLayer({ reduce, track }: { reduce: boolean; track: Track | undefined }) {
  const playing = usePlayer((state) => state.isPlaying);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], ["0vh", "-24vh"]);
  const x = useTransform(scrollY, [0, 900], ["0vw", "-16vw"]);
  const scale = useTransform(scrollY, [0, 900], [1, 0.46]);
  const rotate = useTransform(scrollY, [0, 2600], [-8, 170]);
  const opacity = useTransform(scrollY, [0, 500, 1300], [1, 0.8, 0.3]);

  return (
    <div className="wm-ring-layer" aria-hidden="true">
      <div className="wm-ring-stage">
        <motion.div
          className="wm-orbit"
          style={reduce ? undefined : { y, x, scale, rotate, opacity }}
        >
          <div className="wm-ring wm-ring-a" />
          <div className="wm-ring wm-ring-b" />
          <div className="wm-ring wm-ring-c" />
          <div className="wm-glow" />
          <div className={`wm-core${playing ? " is-playing" : ""}`}>
            {track ? (
              <Artwork track={track} size={480} className="wm-cover" rounded="rounded-full" />
            ) : (
              <div className="wm-core-empty">
                <span>♪</span>
              </div>
            )}
          </div>
          <span className="wm-node wm-node-1" />
          <span className="wm-node wm-node-2" />
          <span className="wm-node wm-node-3" />
        </motion.div>
      </div>
    </div>
  );
}

/* ── Edge navigation: small numbered rail, wide screens only ─────────── */

function ChapterNav({ chapters, reduce }: { chapters: Chapter[]; reduce: boolean }) {
  const [active, setActive] = useState("wm-hero");

  useEffect(() => {
    const ids = ["wm-hero", ...chapters.map((c) => `wm-${c.id}`)];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [chapters]);

  return (
    <nav className="wm-edge-layer" aria-label="بخش‌های صفحه اصلی">
      <ol className="wm-edge">
        {chapters.map((chapter, index) => {
          const id = `wm-${chapter.id}`;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                className="wm-edge-item"
                data-active={active === id}
                aria-label={chapter.title}
                aria-current={active === id ? "true" : undefined}
                onClick={() => scrollToId(id, reduce)}
              >
                <span className="wm-edge-no">{String(index + 1).padStart(2, "0")}</span>
                <span className="wm-edge-label">{chapter.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── A numbered chapter: rule, title and body bound to scroll progress ── */

function ChapterSection({
  id,
  no,
  en,
  title,
  action,
  reduce,
  children,
}: {
  id: string;
  no: string;
  en: string;
  title: string;
  action?: ReactNode;
  reduce: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "start 0.45"] });
  const rule = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const headY = useTransform(scrollYProgress, [0, 1], [34, 0]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.7], [0, 1]);
  const bodyY = useTransform(scrollYProgress, [0.1, 1], [60, 0]);
  const bodyOpacity = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);

  return (
    <section id={id} ref={ref} className="wm-chapter" aria-labelledby={`${id}-title`}>
      <header>
        <div className="wm-chapter-meta">
          <span className="wm-no">{no}</span>
          <span className="wm-rule-track" aria-hidden>
            <motion.span className="wm-rule" style={reduce ? undefined : { scaleX: rule }} />
          </span>
          <span className="wm-en">{en}</span>
        </div>
        <motion.div
          className="wm-chapter-titlerow"
          style={reduce ? undefined : { y: headY, opacity: headOpacity }}
        >
          <h2 id={`${id}-title`} className="wm-chapter-title">
            {title}
          </h2>
          {action}
        </motion.div>
      </header>
      <motion.div
        className="wm-chapter-body"
        style={reduce ? undefined : { y: bodyY, opacity: bodyOpacity }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/* ── Shelves ──────────────────────────────────────────────────────────── */

/** A sideways shelf; mouse users can drag it, touch uses native scroll. */
function Shelf({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startX: number; startScroll: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const active = drag.current;
      const el = ref.current;
      if (!active || !el || event.pointerId !== active.id) return;
      const delta = event.clientX - active.startX;
      if (!active.moved && Math.abs(delta) < 5) return;
      active.moved = true;
      el.scrollLeft = active.startScroll - delta;
      event.preventDefault();
    };
    const end = (event: PointerEvent) => {
      if (!drag.current || event.pointerId !== drag.current.id) return;
      suppressClick.current = drag.current.moved;
      drag.current = null;
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="wm-shelf no-scrollbar"
      onPointerDown={(event) => {
        suppressClick.current = false;
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        drag.current = {
          id: event.pointerId,
          startX: event.clientX,
          startScroll: event.currentTarget.scrollLeft,
          moved: false,
        };
      }}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}

function TrackShelf({ tracks }: { tracks: Track[] }) {
  const playTrack = usePlayer((state) => state.playTrack);
  return (
    <Shelf>
      {tracks.map((track) => (
        <div key={trackKey(track)} className="wm-tile">
          <button
            type="button"
            onClick={() => playTrack(track, tracks)}
            aria-label={`پخش ${track.name}`}
            className="wm-tile-art"
          >
            <TrackThumb track={track} className="size-full rounded-none" />
            <span className="wm-play">
              <Play className="size-4 fill-current" strokeWidth={0} />
            </span>
          </button>
          <div className="wm-tile-name">{track.name}</div>
          <div className="wm-tile-artist">{track.artist.join("، ")}</div>
        </div>
      ))}
    </Shelf>
  );
}
