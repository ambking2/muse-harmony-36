import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronDown, Download, Library, Play, Search, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FEATURED_PLAYLISTS } from "@/lib/featured";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RippleButton } from "@/components/ui/ripple-button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <Hero />
      <ContinueRow />
      <Playlists />
      <RecentlyPlayed />
      <ClosingCta />
    </AppShell>
  );
}

/**
 * Reveal-on-scroll for the full-height sections.
 *
 * `once` so a section does not re-animate every time it crosses the viewport —
 * on a page this tall that reads as flicker. Honours prefers-reduced-motion by
 * skipping straight to the visible state rather than just shortening it.
 */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** A full-viewport section. `svh` keeps the mobile browser chrome from
 *  cropping the last row when the address bar collapses. */
function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="flex min-h-[100svh] items-center scroll-mt-8 px-4 py-20 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <Section>
      <div className="text-center">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-xs font-medium tracking-[0.3em] text-muted-foreground uppercase"
        >
          موسیقی ایرانی و جهانی
        </motion.p>

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-6 max-w-3xl text-5xl font-black leading-[1.15] tracking-tight sm:text-7xl"
        >
          هر آهنگی که
          <br />
          <span className="text-primary">گوش می‌دهی</span>، اینجاست
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          جستجو با نام فارسی کار می‌کند، دانلودش کن و آفلاین گوش بده.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/explore"
            className="flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition active:scale-95"
          >
            <Search className="size-5" strokeWidth={1.5} />
            جستجوی آهنگ
          </Link>
          <a
            href="#playlists"
            className="glass flex items-center gap-2 rounded-full px-6 py-3.5 font-semibold transition hover:bg-white/10"
          >
            <TrendingUp className="size-5" strokeWidth={1.5} />
            مجموعه‌ها
          </a>
        </motion.div>
      </div>

      <motion.div
        aria-hidden
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-16 flex justify-center"
      >
        <ChevronDown className="size-6 animate-bounce text-muted-foreground/60" strokeWidth={1.5} />
      </motion.div>
    </Section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-medium tracking-[0.25em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      {blurb && <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{blurb}</p>}
    </div>
  );
}

/** Pick up the queue where it was left, or offer the last thing played. */
function ContinueRow() {
  const current = usePlayer((s) => s.queue[s.index]);
  const queueLength = usePlayer((s) => s.queue.length);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const history = useLibrary((s) => s.history);
  const tracksById = useLibrary((s) => s.tracksById);

  // When nothing is loaded, the most recent history entry is the closest thing
  // to "continue where you left off".
  const recent = useMemo(() => {
    if (current) return current;
    const latest = history.find((h) => tracksById[h.key]);
    return latest ? tracksById[latest.key] : undefined;
  }, [current, history, tracksById]);

  if (!recent) return null;

  return (
    <Section id="continue">
      <Reveal>
        <SectionTitle
          eyebrow={
            queueLength > 1
              ? `ادامه‌ی پخش · ${queueLength.toLocaleString("fa-IR")} آهنگ در صف`
              : "ادامه‌ی پخش"
          }
          title="همین حالا گوش می‌دهید"
        />

        <Link
          to="/now-playing"
          className="glass-strong group flex items-center gap-4 rounded-3xl p-4 transition hover:bg-white/10 sm:gap-6 sm:p-6"
        >
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/70 to-primary/30 text-2xl sm:size-20">
            <Play
              className={cn("size-7 fill-current", isPlaying && "opacity-90")}
              strokeWidth={1.5}
            />
          </span>
          <span className="min-w-0 flex-1 text-right">
            <span className="block truncate text-xl font-bold sm:text-2xl">{recent.name}</span>
            <span className="mt-1 block truncate text-sm text-muted-foreground">
              {recent.artist.join("، ")}
            </span>
          </span>
          <ArrowLeft
            className="size-6 shrink-0 text-muted-foreground transition group-hover:-translate-x-1"
            strokeWidth={1.5}
          />
        </Link>

        <div className="mt-4 flex flex-wrap gap-3">
          <RippleButton onClick={() => togglePlay()}>{isPlaying ? "توقف" : "پخش"}</RippleButton>
        </div>
      </Reveal>
    </Section>
  );
}

/** The provider's own hand-picked Iranian collections. The card copy is local,
 *  so this section costs no network calls at all. */
function Playlists() {
  return (
    <Section id="playlists">
      <Reveal>
        <SectionTitle
          eyebrow="مجموعه‌ها"
          title="پلی‌لیست‌های ایرانی"
          blurb="فهرست‌هایی که خودِ سرویس ساخته — پاپ، سنتی، و سازهای ایرانی."
        />
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_PLAYLISTS.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.05}>
            <Link
              to="/mix/$id"
              params={{ id: p.id }}
              className="glass group flex h-full flex-col rounded-2xl p-5 transition hover:bg-white/10"
            >
              <span aria-hidden className="text-3xl">
                {p.emoji}
              </span>
              <span className="mt-4 text-lg font-bold">{p.title}</span>
              <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.blurb}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary">
                شنیدن مجموعه
                <ArrowLeft
                  className="size-4 transition group-hover:-translate-x-1"
                  strokeWidth={1.5}
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/** What the listener actually played, newest first. */
function RecentlyPlayed() {
  const history = useLibrary((s) => s.history);
  const tracksById = useLibrary((s) => s.tracksById);
  const library = useLibrary((s) => s.library);
  const downloads = useLibrary((s) => s.downloads.filter((d) => d.status === "done").length);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out = [];
    for (const h of history) {
      if (seen.has(h.key)) continue;
      const t = tracksById[h.key];
      if (!t) continue;
      seen.add(h.key);
      out.push(t);
      if (out.length >= 6) break;
    }
    return out;
  }, [history, tracksById]);

  const hasStats = library.length > 0 || downloads > 0;
  if (!recent.length && !hasStats) return null;

  return (
    <Section id="recent">
      <Reveal>
        <SectionTitle eyebrow="گوش داده‌اید" title="اخیراً گوش دادید" />
      </Reveal>

      {recent.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {recent.map((t, i) => (
            <Reveal key={trackKey(t)} delay={i * 0.04}>
              <div className="glass flex items-center gap-3 rounded-2xl p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-xs text-muted-foreground ltr-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-right">
                  <span className="block truncate text-sm font-semibold">{t.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.artist.join("، ")}
                  </span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {hasStats && (
        <Reveal delay={0.1}>
          <div className="mt-6 flex flex-wrap gap-3">
            {library.length > 0 && (
              <Link
                to="/library"
                className="glass flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition hover:bg-white/10"
              >
                <Library className="size-4" strokeWidth={1.5} />
                کتابخانه · {library.length.toLocaleString("fa-IR")}
              </Link>
            )}
            {downloads > 0 && (
              <Link
                to="/downloads"
                className="glass flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition hover:bg-white/10"
              >
                <Download className="size-4" strokeWidth={1.5} />
                دانلودها · {downloads.toLocaleString("fa-IR")}
              </Link>
            )}
          </div>
        </Reveal>
      )}
    </Section>
  );
}

function ClosingCta() {
  return (
    <Section>
      <Reveal className="text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-black leading-snug tracking-tight sm:text-5xl">
          آهنگ بعدی
          <br />
          منتظر شماست
        </h2>
        <Link
          to="/explore"
          className={cn(
            "mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4",
            "text-base font-semibold text-primary-foreground shadow-xl shadow-primary/25",
            "transition active:scale-95",
          )}
        >
          <Search className="size-5" strokeWidth={1.5} />
          شروع کنیم
        </Link>
      </Reveal>
    </Section>
  );
}
