import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUp, ChevronDown, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import "@/home-motion.css";

import { AppShell } from "@/components/layout/AppShell";
import { CrystalScene } from "@/components/home/CrystalScene";
import { QuickLinks } from "@/components/home/QuickLinks";
import { ResumeCard } from "@/components/home/ResumeCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { TrackThumb } from "@/components/search/Rails";
import { useMounted } from "@/hooks/use-mounted";
import { FEATURED_PLAYLISTS } from "@/lib/featured";
import { HOME_CONFIG as C } from "@/lib/home-config";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Home as one scroll-driven story: a hero with two glass crystals and a
 * suspended ring, an overview index, then the real shelves of the app —
 * continue, recent, favourites, playlists, library — as numbered chapters.
 * The 3D stage is one pinned layer; every movement is a function of scroll.
 * All copy and colours come from `@/lib/home-config`.
 */
function Home() {
  return (
    <AppShell>
      <HomeExperience />
    </AppShell>
  );
}

type ChapterId = keyof typeof C.chapters;

function scrollToId(id: string, reduce: boolean) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

const fa = (n: number) => n.toLocaleString("fa-IR");

function HomeExperience() {
  const reduce = !!useReducedMotion();
  const mounted = useMounted();
  const current = usePlayer((state) => state.queue[state.index]);
  const history = useLibrary((state) => state.history);
  const favorites = useLibrary((state) => state.favorites);
  const library = useLibrary((state) => state.library);
  const tracksById = useLibrary((state) => state.tracksById);

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

  const resumeTrack: Track | undefined =
    current ?? (() => {
      const latest = history.find((entry) => tracksById[entry.key]);
      return latest ? tracksById[latest.key] : undefined;
    })();

  // Library state is client-only; before mount only the always-present chapters
  // render, so server and client markup agree.
  const chapters = useMemo(() => {
    const list: { id: ChapterId; meta?: string }[] = [];
    if (mounted && resumeTrack) list.push({ id: "resume", meta: resumeTrack.name });
    if (mounted && recent.length) list.push({ id: "recent", meta: `${fa(recent.length)} ${C.units.songs}` });
    if (mounted && liked.length) list.push({ id: "favorites", meta: `${fa(liked.length)} ${C.units.songs}` });
    list.push({ id: "playlists", meta: `${fa(FEATURED_PLAYLISTS.length)} ${C.units.playlists}` });
    list.push({
      id: "library",
      meta: mounted ? `${fa(library.length)} ${C.units.songs}` : undefined,
    });
    return list;
  }, [mounted, resumeTrack, recent.length, liked.length, library.length]);

  const anchorIds = useMemo(
    () => ["wm-hero", "wm-overview", ...chapters.map((c) => `wm-${c.id}`), "wm-end"],
    [chapters],
  );

  const pageStyle = {
    "--wm-lime": C.accents.lime,
    "--wm-lav-l": C.accents.lavender,
    "--wm-lav-d": C.accents.lavenderDark,
  } as CSSProperties;

  return (
    <div className={`wm-page${reduce ? " wm-reduced" : ""}`} style={pageStyle}>
      <CrystalScene anchorIds={anchorIds} reduce={reduce} />
      <EdgeRail chapters={chapters} reduce={reduce} />
      <Hero reduce={reduce} onOverview={() => scrollToId("wm-overview", reduce)} />

      <ChapterSection id="wm-overview" no="—" en={C.overview.en} title={C.overview.title} reduce={reduce}>
        <ol className="wm-ov">
          {chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <button
                type="button"
                className="wm-ov-row"
                onClick={() => scrollToId(`wm-${chapter.id}`, reduce)}
              >
                <span className="wm-ov-no">{String(index + 1).padStart(2, "0")}</span>
                <span className="wm-ov-title">{C.chapters[chapter.id].title}</span>
                <span className="wm-ov-meta">{chapter.meta}</span>
                <ArrowLeft className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      </ChapterSection>

      {chapters.map((chapter, index) => (
        <ChapterSection
          key={chapter.id}
          id={`wm-${chapter.id}`}
          no={String(index + 1).padStart(2, "0")}
          en={C.chapters[chapter.id].en}
          title={C.chapters[chapter.id].title}
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

      <section id="wm-end" className="wm-end" aria-label={C.ending.title}>
        <p className="wm-end-title">{C.ending.title}</p>
        <button type="button" className="wm-cta" onClick={() => scrollToId("wm-hero", reduce)}>
          {C.nav.top} <ArrowUp className="size-4" aria-hidden />
        </button>
      </section>
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

function Hero({ reduce, onOverview }: { reduce: boolean; onOverview: () => void }) {
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
  const words = [...C.title.line1, ...C.title.line2];
  const lastWord = words[words.length - 1];

  return (
    <section id="wm-hero" ref={ref} className="wm-hero" aria-label={C.brand}>
      <div className="wm-topbar">
        <span className="wm-brand">
          <i className="wm-dot" /> {C.brand}
        </span>
        <span className="wm-topbar-actions">
          <button type="button" className="wm-pill" onClick={onOverview}>
            {C.nav.overview}
          </button>
          <Link to="/account" className="wm-pill">
            {C.nav.account}
          </Link>
        </span>
      </div>

      <motion.div className="wm-hero-main" style={reduce ? undefined : { y, opacity }}>
        <span className="wm-kicker">{C.kicker}</span>
        <h1 className="wm-title">
          {[C.title.line1, C.title.line2].map((line, li) => (
            <span className="wm-line" key={li}>
              {line.map((word, wi) => {
                const delay = 0.05 + (li * 2 + wi) * 0.12;
                return (
                  <span key={word}>
                    <span className="word">
                      <motion.span
                        className={`word-in${word === lastWord ? " wm-hl" : ""}`}
                        {...rise(delay)}
                      >
                        {word}
                      </motion.span>
                    </span>{" "}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>
        {reduce && <p className="wm-note">{C.reducedMotionNote}</p>}
      </motion.div>

      <div className="wm-hero-foot">
        <span className="wm-index">
          <b>00</b> LISTEN / REPEAT
        </span>
        <button type="button" className="wm-cue" onClick={onOverview}>
          {C.nav.scroll} <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

/* ── Edge: vertical badge, scroll progress line and numbered rail ─────── */

function EdgeRail({
  chapters,
  reduce,
}: {
  chapters: { id: ChapterId }[];
  reduce: boolean;
}) {
  const [active, setActive] = useState("wm-hero");
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const ids = ["wm-hero", "wm-overview", ...chapters.map((c) => `wm-${c.id}`)];
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
    <div className="wm-edge-layer">
      <div className="wm-edge-stage">
        <span className="wm-badge" aria-hidden>
          {C.badge}
        </span>
        <span className="wm-edge-line" aria-hidden>
          <motion.span
            className="wm-edge-fill"
            style={reduce ? { transform: "scaleY(0)" } : { scaleY: scrollYProgress }}
          />
        </span>
        <nav aria-label={C.nav.railLabel}>
          <ol className="wm-edge">
            {chapters.map((chapter, index) => {
              const id = `wm-${chapter.id}`;
              const title = C.chapters[chapter.id].title;
              return (
                <li key={chapter.id}>
                  <button
                    type="button"
                    className="wm-edge-item"
                    data-active={active === id}
                    aria-label={title}
                    aria-current={active === id ? "true" : undefined}
                    onClick={() => scrollToId(id, reduce)}
                  >
                    <span className="wm-edge-no">{String(index + 1).padStart(2, "0")}</span>
                    <span className="wm-edge-label">{title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
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
