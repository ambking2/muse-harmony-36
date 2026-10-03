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
import { GroupTitle } from "@/components/ios/GroupTitle";
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
 * Five cards, each one a group of its own: the account at the top, then the
 * collection, then what you have done with it, then the way into the rest of
 * the app, then the keys. The shape is the iOS settings screen read from the
 * top — a heading, a card, a gap — so each group says what it is before it
 * says what is in it.
 *
 * The groups stay separate on purpose. Welded into one panel they would be a
 * single object with five headings, and nothing would say which rows belong
 * together; separated, each card is one thing you could lift out on its own.
 * Inside a card, the rows run together with only a hairline between them,
 * because they are one list.
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
        <div className="space-y-4">
          <Reveal index={0}>
            <section className="card">
              <GroupTitle>حساب شما</GroupTitle>
              <div className="inset-divided">
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
              </div>
            </section>
          </Reveal>

          <Reveal index={1}>
            <section className="card">
              <GroupTitle value={`${fa(library.length)} آهنگ`}>کتابخانه‌ی شما</GroupTitle>
              <div className="inset-divided">
                <Row
                  plain
                  icon={Music}
                  tone="orange"
                  label="در کتابخانه"
                  detail="هر چیزی که ذخیره کرده‌اید"
                  to="/library"
                  value={fa(library.length)}
                />
                <Row
                  plain
                  icon={Heart}
                  tone="pink"
                  label="علاقه‌مندی‌ها"
                  detail="آهنگ‌ها و خواننده‌های دوست‌داشتنی"
                  to="/favorites"
                  value={fa(favorites.length)}
                />
                <Row
                  plain
                  icon={ListMusic}
                  tone="purple"
                  label="پلی‌لیست‌ها"
                  detail="مجموعه‌هایی که خودتان ساخته‌اید"
                  to="/library"
                  value={fa(playlists.length)}
                />
                <Row
                  plain
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

          <Reveal index={2}>
            <section className="card">
              <GroupTitle>فعالیت شما</GroupTitle>
              <div className="inset-divided">
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
              </div>
            </section>
          </Reveal>

          <Reveal index={3}>
            <section className="card">
              <GroupTitle>دسترسی سریع</GroupTitle>
              <div className="inset-divided">
                <Row plain icon={Search} tone="tint" label="جستجوی آهنگ" to="/explore" />
                <Row plain icon={Disc3} tone="purple" label="کتابخانه و پلی‌لیست" to="/library" />
                <Row plain icon={Download} tone="teal" label="پخش آفلاین" to="/downloads" />
                <Row plain icon={SettingsIcon} tone="gray" label="تنظیمات" to="/settings" />
              </div>
            </section>
          </Reveal>

          <Reveal index={4}>
            <section className="card">
              <GroupTitle>کلیدهای میان‌بر</GroupTitle>
              <div className="inset-divided">
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
              </div>
            </section>
          </Reveal>

          <p className="type-footnote pt-1 text-center text-ios-label-tertiary">
            همه‌ی داده‌ها روی همین دستگاه ذخیره می‌شوند. برای همگام‌سازی، وارد حساب شوید.
          </p>
        </div>
      </Screen>
    </AppShell>
  );
}
