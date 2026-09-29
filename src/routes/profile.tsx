import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Download,
  Heart,
  ListMusic,
  Music,
  Settings,
  Disc3,
  Clock,
  Search,
  Mic2,
  HardDrive,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { formatBytes } from "@/lib/gdmusic";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const library = useLibrary((s) => s.library);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const downloads = useLibrary((s) => s.downloads);
  const history = useLibrary((s) => s.history);
  const favoriteArtists = useLibrary((s) => s.favoriteArtists);
  const tracksById = useLibrary((s) => s.tracksById);

  const done = downloads.filter((d) => d.status === "done");
  const offlineSize = done.reduce((sum, d) => sum + (d.size || 0), 0);

  // Streak of days with at least one play — cheap, but it makes the page feel
  // like it knows something about you rather than just counting rows.
  const activeDays = new Set(history.map((h) => new Date(h.at).toISOString().slice(0, 10))).size;

  const stats = [
    { icon: Music, label: "در کتابخانه", value: library.length, to: "/library" },
    { icon: Heart, label: "علاقه‌مندی", value: favorites.length, to: "/favorites" },
    { icon: ListMusic, label: "پلی‌لیست", value: playlists.length, to: "/library" },
    { icon: HardDrive, label: "آفلاین", value: done.length, to: "/downloads" },
  ] as const;

  const shortcuts = [
    {
      group: "پخش",
      items: [
        ["Space", "پخش / توقف"],
        ["← / →", "جلو و عقب ۵ ثانیه"],
        ["⇧ + ← / →", "آهنگ قبلی / بعدی"],
        ["↑ / ↓", "بلندی صدا"],
      ],
    },
    {
      group: "پخش و صف",
      items: [
        ["S", "پخش تصادفی"],
        ["R", "حالت تکرار"],
        ["M", "بی‌صدا"],
        ["/", "رفتن به جستجو"],
        ["⌘ / Ctrl + K", "جستجوی سریع"],
      ],
    },
  ] as const;

  const topArtists = favoriteArtists.slice(0, 6);
  const recent = history
    .slice(0, 8)
    .map((h) => tracksById[h.key])
    .filter(Boolean);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8"
        >
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklch, var(--track-accent) 40%, transparent), transparent 60%)",
            }}
          />
          <div className="flex items-center gap-4">
            <div
              className="grid size-16 shrink-0 place-items-center rounded-2xl text-2xl text-white shadow-xl"
              style={{ background: "var(--track-accent)" }}
              aria-hidden
            >
              ♪
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">پروفایل شما</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {library.length > 0
                  ? `${library.length.toLocaleString("fa-IR")} آهنگ در کتابخانه‌ی شماست`
                  : "هنوز آهنگی به کتابخانه اضافه نکرده‌اید"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="glass rounded-2xl p-3.5 transition hover:bg-white/10"
              >
                <s.icon className="size-4 text-primary" />
                <div className="mt-2.5 text-2xl font-black ltr-nums">
                  {s.value.toLocaleString("fa-IR")}
                </div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Listening activity */}
        <section className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> فعالیت شما
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="آهنگ پخش‌شده" value={history.length.toLocaleString("fa-IR")} />
            <Metric label="روز فعال" value={activeDays.toLocaleString("fa-IR")} />
            <Metric
              label="خواننده‌ی محبوب"
              value={favoriteArtists.length.toLocaleString("fa-IR")}
            />
            <Metric label="حجم آفلاین" value={offlineSize > 0 ? formatBytes(offlineSize) : "—"} />
          </div>

          {recent.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                اخیراً گوش دادید
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recent.map(
                  (t) =>
                    t && (
                      <Link
                        key={`${t.source}:${t.id}`}
                        to="/artist/$name"
                        params={{ name: t.artist[0] ?? t.name }}
                        className="glass max-w-[12rem] truncate rounded-full px-3 py-1.5 text-xs transition hover:bg-white/10"
                      >
                        {t.name}
                      </Link>
                    ),
                )}
              </div>
            </div>
          )}

          {topArtists.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                خواننده‌های دنبال‌شده
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topArtists.map((a) => (
                  <Link
                    key={a}
                    to="/artist/$name"
                    params={{ name: a }}
                    className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition hover:bg-white/10"
                  >
                    <Mic2 className="size-3" />
                    {a}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Quick links */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">دسترسی سریع</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink to="/explore" icon={Search} label="جستجوی آهنگ" />
            <QuickLink to="/downloads" icon={Disc3} label="پخش آفلاین" />
            <QuickLink to="/library" icon={ListMusic} label="کتابخانه و پلی‌لیست" />
            <QuickLink to="/settings" icon={Settings} label="تنظیمات" />
          </div>
        </section>

        {/* Shortcuts */}
        <section className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-primary" /> کلیدهای میان‌بر
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {shortcuts.map((g) => (
              <div key={g.group}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.group}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {g.items.map(([key, label]) => (
                    <li key={key} className="flex items-center justify-between gap-3">
                      <span>{label}</span>
                      <kbd className="ltr-nums rounded bg-white/10 px-1.5 py-0.5 text-[11px]">
                        {key}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <p className="pb-2 text-center text-xs text-muted-foreground/70">
          همه‌ی داده‌ها فقط روی همین دستگاه ذخیره می‌شوند. هیچ حساب کاربری لازم نیست.
        </p>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-black ltr-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Search; label: string }) {
  return (
    <Link
      to={to}
      className="glass group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm transition hover:bg-white/10"
    >
      <Icon className="size-4 text-primary" />
      <span className="flex-1">{label}</span>
      <ChevronLeft className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}
