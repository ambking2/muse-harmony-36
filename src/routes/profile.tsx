import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Clock,
  Disc3,
  Download,
  HardDrive,
  Heart,
  ListMusic,
  Mic2,
  Music,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Reveal } from "@/components/ios/Reveal";
import { Row } from "@/components/ios/Row";
import { Screen } from "@/components/ios/Screen";
import { useLibrary } from "@/stores/library";
import { useSession } from "@/lib/account";
import { formatBytes } from "@/lib/gdmusic";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

/** Keyboard shortcuts, shown the way a settings list shows a value. */
const SHORTCUTS: readonly (readonly [string, string])[] = [
  ["Space", "پخش / توقف"],
  ["← / →", "جلو و عقب ۵ ثانیه"],
  ["⇧ + ← / →", "آهنگ قبلی / بعدی"],
  ["↑ / ↓", "بلندی صدا"],
  ["S", "پخش تصادفی"],
  ["R", "حالت تکرار"],
  ["M", "بی‌صدا"],
  ["/", "رفتن به جستجو"],
  ["⌘ / Ctrl + K", "جستجوی سریع"],
];

/**
 * Profile.
 *
 * One square, then one list.
 *
 * The square is the collection. It is a single floating object and every
 * window onto what you own lives inside it — the tracks, what you loved, the
 * playlists you made, the files you took offline — each row a coloured tile, a
 * name, a line that says what it really is, and a count on the far edge. Four
 * separate panels would say "these are different things"; they are four views of
 * one shelf. One panel says so, and spends the space on the counts.
 *
 * Below it, everything that is not the collection is one continuous card —
 * account, activity, the way into the rest of the app, the keys. Same iOS
 * grouped-list shape, hairline between the groups and none inside them.
 */
function ProfilePage() {
  const library = useLibrary((state) => state.library);
  const favorites = useLibrary((state) => state.favorites);
  const playlists = useLibrary((state) => state.playlists);
  const downloads = useLibrary((state) => state.downloads);
  const history = useLibrary((state) => state.history);
  const favoriteArtists = useLibrary((state) => state.favoriteArtists);
  const { data: session } = useSession();

  const fa = (value: number) => value.toLocaleString("fa-IR");
  const offline = downloads.filter((item) => item.status === "done");
  const offlineSize = offline.reduce((sum, item) => sum + (item.size || 0), 0);
  // Days with at least one play — cheap, but it makes the page feel like it
  // knows something about you rather than just counting rows.
  const activeDays = new Set(history.map((entry) => new Date(entry.at).toISOString().slice(0, 10)))
    .size;

  return (
    <AppShell>
      <Screen title="پروفایل" subtitle={session?.username ?? "مهمان"}>
        <div className="space-y-5">
          <Reveal index={0}>
            <section className="card flex aspect-square flex-col">
              <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
                <h2 className="type-footnote font-semibold text-ios-tint">کتابخانه‌ی شما</h2>
                <span className="type-footnote ltr-nums text-ios-label-secondary">
                  {fa(library.length)} آهنگ
                </span>
              </header>

              <div className="flex flex-1 flex-col divide-y divide-ios-separator">
                <Row
                  plain
                  className="flex-1"
                  icon={Music}
                  tone="orange"
                  label="در کتابخانه"
                  detail="هر چیزی که ذخیره کرده‌اید"
                  to="/library"
                  value={fa(library.length)}
                />
                <Row
                  plain
                  className="flex-1"
                  icon={Heart}
                  tone="pink"
                  label="علاقه‌مندی‌ها"
                  detail="آهنگ‌ها و خواننده‌های دوست‌داشتنی"
                  to="/favorites"
                  value={fa(favorites.length)}
                />
                <Row
                  plain
                  className="flex-1"
                  icon={ListMusic}
                  tone="purple"
                  label="پلی‌لیست‌ها"
                  detail="مجموعه‌هایی که خودتان ساخته‌اید"
                  to="/library"
                  value={fa(playlists.length)}
                />
                <Row
                  plain
                  className="flex-1"
                  icon={HardDrive}
                  tone="teal"
                  label="پخش آفلاین"
                  detail={
                    offlineSize > 0
                      ? `بدون اینترنت · ${formatBytes(offlineSize)}`
                      : "برای گوش دادن بدون اینترنت"
                  }
                  to="/downloads"
                  value={offline.length ? fa(offline.length) : undefined}
                />
              </div>
            </section>
          </Reveal>

          <Reveal index={1}>
            <section className="card divide-y divide-ios-separator">
              <Row
                plain
                icon={UserRound}
                tone="tint"
                label={session?.username ?? "ورود و ثبت‌نام"}
                detail={
                  session
                    ? "پلی‌لیست‌ها و علاقه‌مندی‌ها با حساب شما همگام می‌شوند"
                    : "با ورود، پلی‌لیست‌ها و علاقه‌مندی‌ها بین دستگاه‌هایتان می‌آیند"
                }
                to="/account"
              />

              <GroupTitle>فعالیت شما</GroupTitle>
              <Row
                plain
                icon={Sparkles}
                tone="indigo"
                label="آهنگ پخش‌شده"
                value={fa(history.length)}
              />
              <Row plain icon={Clock} tone="gray" label="روز فعال" value={fa(activeDays)} />
              <Row
                plain
                icon={Mic2}
                tone="green"
                label="خواننده‌های دنبال‌شده"
                to="/favorites"
                value={fa(favoriteArtists.length)}
              />

              <GroupTitle>دسترسی سریع</GroupTitle>
              <Row plain icon={Search} tone="tint" label="جستجوی آهنگ" to="/explore" />
              <Row plain icon={Disc3} tone="purple" label="کتابخانه و پلی‌لیست" to="/library" />
              <Row plain icon={Download} tone="teal" label="پخش آفلاین" to="/downloads" />
              <Row plain icon={SettingsIcon} tone="gray" label="تنظیمات" to="/settings" />

              <GroupTitle>کلیدهای میان‌بر</GroupTitle>
              {SHORTCUTS.map(([keys, label]) => (
                <Row
                  key={keys}
                  plain
                  label={label}
                  accessory={
                    <kbd className="type-footnote rounded-md bg-ios-fill px-2 py-1 ltr-nums">
                      {keys}
                    </kbd>
                  }
                />
              ))}
            </section>
          </Reveal>

          <p className="type-footnote text-center text-ios-label-tertiary">
            همه‌ی داده‌ها روی همین دستگاه ذخیره می‌شوند. برای همگام‌سازی، وارد حساب شوید.
          </p>
        </div>
      </Screen>
    </AppShell>
  );
}

/** A group's name inside the continuous card — small, tinted, and the only
 *  thing the hairline above it separates. */
function GroupTitle({ children }: { children: ReactNode }) {
  return <h2 className="type-footnote px-4 pb-1 pt-4 font-semibold text-ios-tint">{children}</h2>;
}
