import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { Artwork } from "@/components/music/Artwork";
import { formatBytes } from "@/lib/gdmusic";
import type { Track } from "@/lib/types";
import { cancelDownload, playDownload, retryDownload } from "@/lib/download";
import { Check, Download as DownloadIcon, Play, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/downloads")({ component: DownloadsPage });

function DownloadsPage() {
  const navigate = useNavigate();
  const downloads = useLibrary((s) => s.downloads);
  const remove = useLibrary((s) => s.removeDownload);
  const playTrack = usePlayer((s) => s.playTrack);

  const done = downloads.filter((d) => d.status === "done");
  const totalSize = done.reduce((sum, d) => sum + (d.size || 0), 0);
  // Local copies carry their own srcUrl so the audio engine skips the network.
  const downloadable: Track[] = done
    .filter((d) => !!d.blobUrl)
    .map((d) => ({ ...d.track, srcUrl: d.blobUrl, picUrl: d.track.picUrl }));

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="آفلاین"
          title="دانلودها"
          action={
            downloadable.length > 1 && (
              <button
                onClick={() => {
                  playTrack(downloadable[0], downloadable);
                  navigate({ to: "/now-playing" });
                }}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
              >
                <Play className="size-4" /> پخش آفلاین
              </button>
            )
          }
        />

        {downloads.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="ltr-nums">{done.length.toLocaleString("fa-IR")}</span> آهنگ آفلاین
            {totalSize > 0 && (
              <>
                {" · "}
                <span className="ltr-nums">{formatBytes(totalSize)}</span>
              </>
            )}
          </p>
        )}

        {downloads.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            <DownloadIcon className="mx-auto size-10" />
            <p className="mt-3 text-sm">هنوز آهنگی دانلود نکرده‌اید.</p>
            <p className="mt-1 text-xs opacity-70">
              از منوی هر آهنگ گزینه‌ی «دانلود» را بزنید تا برای پخش آفلاین ذخیره شود.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {downloads.map((d) => (
            <div key={d.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              <Artwork track={d.track} size={100} className="size-14" rounded="rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.track.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.track.artist.join("، ")} ·{" "}
                  <span className="ltr-nums">{d.br === 999 ? "FLAC" : `${d.br} kbps`}</span>
                  {d.size > 0 && (
                    <>
                      {" · "}
                      <span className="ltr-nums">{formatBytes(d.size)}</span>
                    </>
                  )}
                </div>
                {d.status === "downloading" && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: `${Math.min(100, Math.round(d.progress * 100))}%` }}
                    />
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <StatusIcon status={d.status} />
                  {statusLabel(d.status, d.progress)}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {d.status === "downloading" && (
                  <IconBtn onClick={() => cancelDownload(d.id)} label="لغو">
                    <X className="size-4" />
                  </IconBtn>
                )}
                {(d.status === "error" || d.status === "paused") && (
                  <IconBtn onClick={() => void retryDownload(d)} label="تلاش دوباره">
                    <RefreshCw className="size-4" />
                  </IconBtn>
                )}
                {d.status === "done" && (
                  <IconBtn
                    onClick={() => {
                      const local = playDownload(d);
                      if (local) {
                        playTrack(local, [local]);
                        navigate({ to: "/now-playing" });
                      }
                    }}
                    label="پخش آفلاین"
                    primary
                  >
                    <Play className="size-4" />
                  </IconBtn>
                )}
                {d.status === "done" && d.blobUrl && (
                  <a
                    href={d.blobUrl}
                    download
                    className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                    aria-label="ذخیره در دستگاه"
                    title="ذخیره در دستگاه"
                  >
                    <DownloadIcon className="size-4" />
                  </a>
                )}
                <IconBtn
                  onClick={() => {
                    remove(d.id);
                    toast.success("دانلود حذف شد");
                  }}
                  label="حذف"
                  danger
                >
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>

        {downloads.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            فایل‌ها روی همین دستگاه ذخیره می‌شوند. برای پاک‌کردن همه، از تنظیمات استفاده کنید.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function StatusIcon({
  status,
}: {
  status: "queued" | "downloading" | "paused" | "done" | "error";
}) {
  if (status === "done") return <Check className="size-3 text-emerald-400" />;
  if (status === "error") return <X className="size-3 text-destructive" />;
  return null;
}

function statusLabel(status: string, progress: number) {
  switch (status) {
    case "done":
      return "آماده‌ی پخش آفلاین";
    case "error":
      return "ناموفق";
    case "paused":
      return "متوقف شد";
    case "queued":
      return "در صف";
    default:
      return `در حال دانلود ${Math.round(progress * 100).toLocaleString("fa-IR")}٪`;
  }
}

function IconBtn({
  children,
  onClick,
  label,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 place-items-center rounded-full transition active:scale-90",
        primary
          ? "bg-primary text-primary-foreground"
          : danger
            ? "text-muted-foreground hover:bg-white/10 hover:text-destructive"
            : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
