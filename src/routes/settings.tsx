import { createFileRoute } from "@tanstack/react-router";
import {
  Database,
  HardDriveDownload,
  Heart,
  Layers,
  ListMusic,
  Moon,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Row } from "@/components/ios/Row";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { Segmented } from "@/components/ios/Segmented";
import { Switch } from "@/components/ui/switch";
import { QUALITIES, formatBytes } from "@/lib/gdmusic";
import { setGlassMode, useGlassMode } from "@/lib/glass";
import { setTheme, useTheme } from "@/lib/theme";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import type { Quality } from "@/lib/types";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

/**
 * Settings.
 *
 * The iOS Settings screen, adapted: every group is a card of rows, and the
 * three controls that have a small fixed set of options are segmented controls
 * inside the card rather than a row that opens another screen. Nothing here
 * needs a second page to say it.
 */
function SettingsPage() {
  const glass = useGlassMode();
  const theme = useTheme();
  const quality = usePlayer((state) => state.quality);
  const setQuality = usePlayer((state) => state.setQuality);
  const sleepAt = usePlayer((state) => state.sleepAt);
  const setSleep = usePlayer((state) => state.setSleepMinutes);
  const rate = usePlayer((state) => state.playbackRate);
  const setRate = usePlayer((state) => state.setPlaybackRate);
  const clearSearch = useLibrary((state) => state.clearSearchHistory);
  const downloads = useLibrary((state) => state.downloads);
  const library = useLibrary((state) => state.library);
  const favorites = useLibrary((state) => state.favorites);
  const playlists = useLibrary((state) => state.playlists);

  const remaining = sleepAt ? Math.max(0, Math.ceil((sleepAt - Date.now()) / 60000)) : 0;
  const offlineSize = downloads
    .filter((item) => item.status === "done")
    .reduce((sum, item) => sum + (item.size || 0), 0);

  return (
    <AppShell>
      <Screen title="تنظیمات">
        <div className="mt-4">
          <Section
            title="نمایش"
            footer={
              glass === "on"
                ? "المان‌ها روی کاور محو پخش‌شده‌ی موسیقی شناورند. خاموش‌کردنشان مات و کم‌هزینه‌تر می‌شود."
                : "المان‌ها مات و بدون محو هستند — مناسب دستگاه‌های کم‌توان یا صفحه‌های کم‌نور."
            }
          >
            <Row
              icon={theme === "dark" ? Moon : Sun}
              tone="slate"
              label="حالت تاریک"
              detail="روشن به‌صورت پیش‌فرض"
              accessory={
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  aria-label="حالت تاریک"
                  className="relative h-8 w-14 border-0 bg-ios-fill data-[state=checked]:bg-ios-green after:absolute after:-inset-1 after:content-[''] [&>span]:h-7 [&>span]:w-7 [&>span]:bg-white data-[state=checked]:[&>span]:translate-x-6"
                />
              }
            />
            <Row
              icon={Layers}
              tone="violet"
              label="حالت شیشه‌ای"
              detail="شفافیت و محوِ پس‌زمینه"
              accessory={
                <Switch
                  checked={glass === "on"}
                  onCheckedChange={(checked) => setGlassMode(checked ? "on" : "off")}
                  aria-label="حالت شیشه‌ای"
                  className="relative h-8 w-14 border-0 bg-ios-fill data-[state=checked]:bg-ios-green after:absolute after:-inset-1 after:content-[''] [&>span]:h-7 [&>span]:w-7 [&>span]:bg-white data-[state=checked]:[&>span]:translate-x-6"
                />
              }
            />
          </Section>

          <Section
            title="پخش"
            footer="کیفیت بالاتر مصرف داده بیشتری دارد. FLAC فقط وقتی موجود باشد پخش می‌شود."
          >
            <div className="card p-4">
              <p className="type-body">کیفیت پخش</p>
              <Segmented
                className="mt-2"
                value={String(quality)}
                onChange={(value) => setQuality(Number(value) as Quality)}
                options={QUALITIES.map((option) => ({
                  value: String(option.br),
                  label: option.br === 999 ? "FLAC" : `${option.br}`,
                }))}
              />
            </div>

            <div className="card p-4">
              <p className="type-body">سرعت پخش</p>
              <Segmented
                className="mt-2"
                value={String(rate)}
                onChange={(value) => setRate(Number(value))}
                options={RATES.map((option) => ({
                  value: String(option),
                  label: `${option}×`,
                }))}
              />
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="type-body">تایمر خواب</p>
                {sleepAt && (
                  <button
                    type="button"
                    onClick={() => setSleep(null)}
                    className="press rounded-lg px-2 py-2 type-footnote text-ios-red"
                  >
                    لغو
                  </button>
                )}
              </div>
              <Segmented
                className="mt-2"
                value={sleepAt ? String(SLEEP_OPTIONS.find((m) => remaining <= m) ?? "") : ""}
                onChange={(value) => {
                  const minutes = Number(value);
                  if (!minutes) return;
                  setSleep(minutes);
                  toast.success(`تا ${minutes.toLocaleString("fa-IR")} دقیقه دیگر متوقف می‌شود`);
                }}
                options={SLEEP_OPTIONS.map((minutes) => ({
                  value: String(minutes),
                  label: String(minutes),
                }))}
              />
              {sleepAt && (
                <p className="type-footnote mt-2 text-ios-label-secondary">
                  حدود {remaining.toLocaleString("fa-IR")} دقیقه دیگر متوقف می‌شود.
                </p>
              )}
            </div>
          </Section>

          <Section
            title="دانلودها و حافظه"
            footer="فایل‌های دانلودشده روی همین دستگاه و در IndexedDB ذخیره می‌شوند و با بستن مرورگر از بین نمی‌روند."
          >
            <Row
              icon={HardDriveDownload}
              tone="cyan"
              label="آهنگ‌های آفلاین"
              value={`${downloads.filter((item) => item.status === "done").length.toLocaleString("fa-IR")} فایل${
                offlineSize > 0 ? ` · ${formatBytes(offlineSize)}` : ""
              }`}
              to="/downloads"
            />
            <Row
              icon={Database}
              tone="amber"
              label="آهنگ‌های کتابخانه"
              value={library.length.toLocaleString("fa-IR")}
              to="/library"
            />
            <Row
              icon={Heart}
              tone="rose"
              label="علاقه‌مندی‌ها"
              value={favorites.length.toLocaleString("fa-IR")}
              to="/favorites"
            />
            <Row
              icon={ListMusic}
              tone="sky"
              label="پلی‌لیست‌ها"
              value={playlists.length.toLocaleString("fa-IR")}
              to="/library"
            />
          </Section>

          <Section
            title="جستجو"
            footer="جستجو حروف عربی/فارسی را یکسان‌سازی می‌کند، نام‌های فارسی را به شکل لاتین نگاشت می‌کند و آثار ایرانی را بالاتر می‌آورد. همه‌ی درخواست‌ها از یک پروکسی سمت سرور عبور می‌کنند."
          >
            <Row
              icon={Search}
              tone="violet"
              label="پاک کردن تاریخچه‌ی جستجو"
              onClick={() => {
                clearSearch();
                toast.success("تاریخچه‌ی جستجو پاک شد");
              }}
            />
          </Section>

          <Section title="داده‌ها">
            <Row
              icon={Trash2}
              tone="red"
              destructive
              label="بازنشانی همه‌ی داده‌ها"
              detail="کتابخانه، علاقه‌مندی‌ها، پلی‌لیست‌ها، تاریخچه و دانلودها پاک می‌شوند."
              onClick={() => {
                if (
                  !confirm(
                    "همه‌ی داده‌ها — کتابخانه، علاقه‌مندی‌ها، پلی‌لیست‌ها، تاریخچه و دانلودها — پاک شود؟",
                  )
                )
                  return;
                void resetEverything();
              }}
            />
          </Section>

          <p className="type-footnote pb-2 text-center text-ios-label-tertiary">
            muis · ساخته‌شده برای گوش دادن بی‌دردسر
          </p>
        </div>
      </Screen>
    </AppShell>
  );
}

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const SLEEP_OPTIONS = [5, 15, 30, 45, 60, 90] as const;

/** Wipe both the zustand store and the IndexedDB audio store. */
async function resetEverything() {
  const { clearAudioStore } = await import("@/lib/offline");
  await clearAudioStore();
  localStorage.removeItem("muis-library");
  toast.success("همه‌ی داده‌ها پاک شد");
  window.location.reload();
}
