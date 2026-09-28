import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { Download, Heart, ListMusic, Music, Settings, Disc3, Clock, Search } from "lucide-react";
import { formatBytes } from "@/lib/gdmusic";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const library = useLibrary((s) => s.library);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const downloads = useLibrary((s) => s.downloads);
  const history = useLibrary((s) => s.history);
  const favoriteArtists = useLibrary((s) => s.favoriteArtists);

  const offlineSize = downloads
    .filter((d) => d.status === "done")
    .reduce((sum, d) => sum + (d.size || 0), 0);

  const stats = [
    { icon: Music, label: "آهنگ‌ها", value: library.length },
    { icon: Heart, label: "علاقه‌مندی", value: favorites.length },
    { icon: ListMusic, label: "پلی‌لیست", value: playlists.length },
    { icon: Download, label: "دانلود", value: downloads.filter((d) => d.status === "done").length },
  ];

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
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader eyebrow="پروفایل محلی" title="شما" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={
                s.label === "دانلود"
                  ? "/downloads"
                  : s.label === "پلی‌لیست"
                    ? "/library"
                    : s.label === "علاقه‌مندی"
                      ? "/favorites"
                      : "/library"
              }
              className="glass rounded-2xl p-4 transition hover:bg-white/10"
            >
              <s.icon className="size-5 text-primary" />
              <div className="mt-3 text-2xl font-black ltr-nums">
                {s.value.toLocaleString("fa-IR")}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </Link>
          ))}
        </div>

        <section className="glass rounded-2xl p-4">
          <h2 className="font-semibold">دسترسی سریع</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <QuickLink to="/explore" icon={Search} label="جستجوی آهنگ" />
            <QuickLink to="/downloads" icon={Disc3} label="پخش آفلاین" />
            <QuickLink to="/library" icon={ListMusic} label="کتابخانه و پلی‌لیست" />
            <QuickLink to="/settings" icon={Settings} label="تنظیمات" />
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="glass rounded-2xl p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock className="size-4 text-primary" /> آمار
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label="آهنگ‌های پخش‌شده"
                value={`${history.length.toLocaleString("fa-IR")} آهنگ`}
              />
              <Row
                label="خواننده‌های محبوب"
                value={`${favoriteArtists.length.toLocaleString("fa-IR")} خواننده`}
              />
              <Row label="حجم دانلودها" value={offlineSize > 0 ? formatBytes(offlineSize) : "—"} />
            </dl>
          </section>

          <section className="glass rounded-2xl p-4">
            <h2 className="font-semibold">کلیدهای میان‌بر</h2>
            <div className="mt-3 space-y-4">
              {shortcuts.map((g) => (
                <div key={g.group}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {g.group}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
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
        </div>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          همه‌ی داده‌ها فقط روی همین دستگاه ذخیره می‌شوند. هیچ حساب کاربری لازم نیست.
        </p>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Search; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm transition hover:bg-white/10"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </Link>
  );
}
