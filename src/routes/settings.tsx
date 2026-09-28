import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { QUALITIES, SOURCES } from "@/lib/gdmusic";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import type { Quality } from "@/lib/types";
import { toast } from "sonner";
import { formatBytes } from "@/lib/gdmusic";
import { Database, HardDriveDownload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [5, 15, 30, 45, 60, 90];

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const quality = usePlayer((s) => s.quality);
  const setQuality = usePlayer((s) => s.setQuality);
  const sleepAt = usePlayer((s) => s.sleepAt);
  const setSleep = usePlayer((s) => s.setSleepMinutes);
  const rate = usePlayer((s) => s.playbackRate);
  const setRate = usePlayer((s) => s.setPlaybackRate);
  const clearSearch = useLibrary((s) => s.clearSearchHistory);
  const downloads = useLibrary((s) => s.downloads);
  const library = useLibrary((s) => s.library);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);

  const remaining = sleepAt ? Math.max(0, Math.ceil((sleepAt - Date.now()) / 60000)) : 0;

  const offlineSize = downloads
    .filter((d) => d.status === "done")
    .reduce((sum, d) => sum + (d.size || 0), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader eyebrow="برنامه" title="تنظیمات" />

        <Card title="کیفیت پخش">
          <div className="flex flex-wrap gap-2">
            {QUALITIES.map((q) => (
              <Chip
                key={q.br}
                active={quality === q.br}
                onClick={() => setQuality(q.br as Quality)}
              >
                {q.label}
              </Chip>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            کیفیت بالاتر مصرف داده بیشتری دارد. FLAC فقط وقتی موجود باشد پخش می‌شود.
          </p>
        </Card>

        <Card title="سرعت پخش">
          <div className="flex flex-wrap gap-2">
            {RATES.map((r) => (
              <Chip key={r} active={rate === r} onClick={() => setRate(r)}>
                <span className="ltr-nums">{r}×</span>
              </Chip>
            ))}
          </div>
        </Card>

        <Card title="تایمر خواب">
          <div className="flex flex-wrap gap-2">
            {SLEEP_OPTIONS.map((m) => (
              <Chip
                key={m}
                active={sleepAt !== null}
                onClick={() => {
                  setSleep(m);
                  toast.success(`تا ${m} دقیقه دیگر متوقف می‌شود`);
                }}
              >
                <span className="ltr-nums">{m}</span> دقیقه
              </Chip>
            ))}
            {sleepAt && (
              <button
                onClick={() => setSleep(null)}
                className="rounded-full px-4 py-2 text-sm text-destructive"
              >
                لغو
              </button>
            )}
          </div>
          {sleepAt && (
            <p className="mt-3 text-xs text-muted-foreground ltr-nums">
              حدود {remaining.toLocaleString("fa-IR")} دقیقه دیگر متوقف می‌شود.
            </p>
          )}
        </Card>

        <Card title="دانلودها و حافظه">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <HardDriveDownload className="size-4" /> آهنگ‌های آفلاین
              </span>
              <span className="ltr-nums">
                {downloads.filter((d) => d.status === "done").length.toLocaleString("fa-IR")} فایل
                {offlineSize > 0 && ` · ${formatBytes(offlineSize)}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Database className="size-4" /> آهنگ‌های کتابخانه
              </span>
              <span className="ltr-nums">{library.length.toLocaleString("fa-IR")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">علاقه‌مندی‌ها</span>
              <span className="ltr-nums">{favorites.length.toLocaleString("fa-IR")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">پلی‌لیست‌ها</span>
              <span className="ltr-nums">{playlists.length.toLocaleString("fa-IR")}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            فایل‌های دانلودشده روی همین دستگاه و در IndexedDB ذخیره می‌شوند و با بستن مرورگر از بین
            نمی‌روند.
          </p>
        </Card>

        <Card title="منابع داده">
          <p className="text-sm text-muted-foreground">
            داده‌های موسیقی از {SOURCES.map((s) => s.label).join("، ")} و از طریق یک پروکسی سمت سرور
            دریافت می‌شود.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            جستجو به‌صورت خودکار حروف عربی/فارسی را یکسان‌سازی می‌کند و در صورت کم‌بودن نتایج، شکل
            لاتین عبارت را هم امتحان می‌کند.
          </p>
        </Card>

        <Card title="داده‌ها">
          <div className="flex flex-wrap gap-2">
            <Chip
              onClick={() => {
                clearSearch();
                toast.success("تاریخچه‌ی جستجو پاک شد");
              }}
            >
              پاک کردن تاریخچه‌ی جستجو
            </Chip>
            <button
              onClick={() => {
                if (
                  !confirm(
                    "همه‌ی داده‌ها — کتابخانه، علاقه‌مندی‌ها، پلی‌لیست‌ها، تاریخچه و دانلودها — پاک شود؟",
                  )
                )
                  return;
                clearDownloadsAndStore();
              }}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> بازنشانی همه‌ی داده‌ها
            </button>
          </div>
        </Card>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          muis · ساخته‌شده برای گوش دادن بی‌دردسر
        </p>
      </div>
    </AppShell>
  );
}

/** Wipe both the zustand store and the IndexedDB audio store. */
async function clearDownloadsAndStore() {
  const { clearAudioStore } = await import("@/lib/offline");
  await clearAudioStore();
  localStorage.removeItem("muis-library");
  toast.success("همه‌ی داده‌ها پاک شد");
  window.location.reload();
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-2 text-sm transition",
        active
          ? "bg-primary font-semibold text-primary-foreground"
          : "glass text-foreground/90 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
