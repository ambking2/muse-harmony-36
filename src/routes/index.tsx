import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { searchSmart } from "@/lib/gdmusic";
import { isIranianTrack } from "@/lib/search";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork } from "@/components/music/Artwork";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";
import type { Track } from "@/lib/types";
import { Play, Shuffle, Sparkles, Heart, History, Search } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

const CURATED = [
  "پاپ ایرانی",
  "موسیقی بی کلام",
  "رپ فارسی",
  "سینمایی ایرانی",
  "دسته‌بند ملایران",
  "موسیقی سنتی ایرانی",
  "lofi beats",
  "chill vibes",
];

/** Personalised lanes for a signed-out-but-returning visitor. */
const MOOD_LANES: { title: string; query: string }[] = [
  { title: "محبوب‌های امروز", query: "پاپ ایرانی" },
  { title: "برای تمرکز", query: "موسیقی بی کلام" },
  { title: "انرژی و انگیزه", query: "رپ فارسی" },
  { title: "موسیقی نوستالژیک", query: "ترانه های قدیمی" },
];

function Home() {
  const library = useLibrary((s) => s.library);
  const history = useLibrary((s) => s.history);
  const tracksById = useLibrary((s) => s.tracksById);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);

  // Iranian catalogue first — the app's home surface is Persian-language.
  const trending = useQuery({
    queryKey: ["home-trending"],
    queryFn: () => searchSmart("پاپ ایرانی", { count: 12 }),
    staleTime: 10 * 60_000,
  });

  const global = useQuery({
    queryKey: ["home-global"],
    queryFn: () => searchSmart("top hits", { count: 12, iranianFirst: false }),
    staleTime: 10 * 60_000,
  });

  const recentlyPlayed: Track[] = history
    .slice(0, 10)
    .map((h) => tracksById[h.key])
    .filter(Boolean);
  const continueListening = recentlyPlayed.slice(0, 8);

  const trendingList = trending.data ?? [];
  const iranianTrending = trendingList.filter(isIranianTrack);
  // Fall back to the global lane if the Persian one came back thin.
  const heroList = iranianTrending.length >= 4 ? iranianTrending : trendingList;

  return (
    <AppShell>
      <div className="space-y-10">
        <Hero
          onPlay={() => heroList.length && usePlayer.getState().playQueue(heroList, 0)}
          onShuffle={() => {
            if (!heroList.length) return;
            usePlayer.getState().playQueue(heroList, 0);
            usePlayer.getState().toggleShuffle();
          }}
          disabled={!heroList.length}
        />

        {/* Mood lanes */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {CURATED.map((c) => (
            <Link
              key={c}
              to="/explore"
              search={{ q: c }}
              className="glass shrink-0 rounded-full px-4 py-2 text-sm text-foreground/90 transition hover:bg-white/10"
            >
              {c}
            </Link>
          ))}
        </div>

        {continueListening.length > 0 && (
          <Section title="ادامه‌ی گوش دادن" icon={History}>
            <HScroll>
              {continueListening.map((t) => (
                <TrackCard key={trackKey(t)} track={t} list={recentlyPlayed} />
              ))}
            </HScroll>
          </Section>
        )}

        {library.length > 0 && (
          <Section
            title="کتابخانه‌ی من"
            icon={Sparkles}
            action={
              <button
                onClick={() => usePlayer.getState().playQueue(library, 0)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                <Play className="size-4" /> پخش همه
              </button>
            }
          >
            <div className="space-y-1">
              {library.slice(0, 6).map((t, i) => (
                <TrackRow key={trackKey(t)} track={t} index={i} list={library} />
              ))}
            </div>
          </Section>
        )}

        {playlists.length > 0 && (
          <Section title="پلی‌لیست‌های من" icon={Sparkles}>
            <HScroll>
              {playlists.map((p) => (
                <Link key={p.id} to="/playlist/$id" params={{ id: p.id }} className="w-40 shrink-0">
                  <div className="glass flex aspect-square items-center justify-center rounded-2xl">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                  <div className="mt-2 truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground ltr-nums">
                    {p.trackKeys.length.toLocaleString("fa-IR")} آهنگ
                  </div>
                </Link>
              ))}
            </HScroll>
          </Section>
        )}

        <Section title="داغ‌ترین‌های ایرانی" icon={Play}>
          {trending.isLoading ? (
            <SkeletonRow />
          ) : heroList.length ? (
            <HScroll>
              {heroList.map((t) => (
                <TrackCard key={trackKey(t)} track={t} list={heroList} />
              ))}
            </HScroll>
          ) : (
            <EmptyHint text="آهنگی بارگذاری نشد. صفحه‌ی جستجو را امتحان کنید." />
          )}
        </Section>

        {MOOD_LANES.slice(1).map((lane) => (
          <MoodLane key={lane.title} {...lane} />
        ))}

        {(global.data ?? []).length > 0 && (
          <Section title="صدای جهان" icon={Play}>
            <HScroll>
              {(global.data ?? []).map((t) => (
                <TrackCard key={trackKey(t)} track={t} list={global.data ?? []} />
              ))}
            </HScroll>
          </Section>
        )}

        {favorites.length > 0 && (
          <Section title="آهنگ‌های محبوب شما" icon={Heart}>
            <div className="space-y-1">
              {favorites
                .slice(0, 5)
                .map((k) => tracksById[k])
                .filter(Boolean)
                .map((t, i) => (
                  <TrackRow key={trackKey(t)} track={t} index={i} />
                ))}
            </div>
          </Section>
        )}
      </div>
    </AppShell>
  );
}

function Hero({
  onPlay,
  onShuffle,
  disabled,
}: {
  onPlay: () => void;
  onShuffle: () => void;
  disabled?: boolean;
}) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--track-accent) 45%, transparent), transparent 65%)",
        }}
      />
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        ایرانی، اول
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-balance sm:text-5xl">
        موسیقی‌ات را همین حالا بزن
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
        جستجوی هوشمند فارسی، متن ترانه‌ی همگام، پخش آفلاین و صف هوشمند — همه در یک اپ.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onPlay}
          disabled={disabled}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition active:scale-95 disabled:opacity-40"
        >
          <Play className="size-5" /> پخش
        </button>
        <button
          onClick={onShuffle}
          disabled={disabled}
          className="glass-strong flex items-center gap-2 rounded-full px-5 py-3 font-semibold transition active:scale-95 disabled:opacity-40"
        >
          <Shuffle className="size-5" /> تصادفی
        </button>
        <Link
          to="/explore"
          className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <Search className="size-4" /> جستجو
        </Link>
      </div>
    </header>
  );
}

function Section({
  title,
  children,
  action,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: typeof Play;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          {Icon && <Icon className="size-4 text-primary" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">{children}</div>;
}

function SkeletonRow() {
  return (
    <HScroll>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-40 shrink-0">
          <div className="skeleton aspect-square rounded-2xl" />
          <div className="skeleton mt-2 h-3 w-24 rounded" />
        </div>
      ))}
    </HScroll>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Link
      to="/explore"
      className="glass block rounded-2xl p-8 text-center text-sm text-muted-foreground transition hover:bg-white/10"
    >
      {text}
    </Link>
  );
}

function MoodLane({ title, query }: { title: string; query: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["mood", query],
    queryFn: () => searchSmart(query, { count: 8 }),
    staleTime: 20 * 60_000,
  });
  return (
    <Section title={title} icon={Play}>
      {isLoading ? (
        <SkeletonRow />
      ) : (
        <HScroll>
          {(data ?? []).map((t) => (
            <TrackCard key={trackKey(t)} track={t} list={data ?? []} />
          ))}
        </HScroll>
      )}
    </Section>
  );
}

function TrackCard({ track, list }: { track: Track; list: Track[] }) {
  const playTrack = usePlayer((s) => s.playTrack);
  return (
    <button onClick={() => playTrack(track, list)} className="group w-40 shrink-0 text-right">
      <div className="relative overflow-hidden rounded-2xl">
        <Artwork track={track} size={300} className="aspect-square" rounded="rounded-2xl" />
        <div className="absolute bottom-2 left-2 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-xl transition group-hover:opacity-100">
          <Play className="size-5" />
        </div>
      </div>
      <div className="mt-2 truncate text-sm font-medium">{track.name}</div>
      <div className="truncate text-xs text-muted-foreground">{track.artist.join("، ")}</div>
    </button>
  );
}
