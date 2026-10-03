import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Screen } from "@/components/ios/Screen";
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
      <Screen
        title="دانلودها"
        subtitle={
          done.length
            ? `${done.length.toLocaleString("fa-IR")} آهنگ${totalSize > 0 ? ` · ${formatBytes(totalSize)}` : ""}`
            : "برای پخش بدون اینترنت"
        }
        actions={
          downloadable.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                playTrack(downloadable[0], downloadable);
                navigate({ to: "/now-playing" });
              }}
              className="press type-footnote text-ios-tint"
            >
              پخش
            </button>
          ) : undefined
        }
      >
        <div className="mt-4 space-y-2">
          {downloads.length === 0 ? (
            <EmptyState
              icon={DownloadIcon}
              title="هنوز آهنگی دانلود نکرده‌اید"
              description="از منوی هر آهنگ گزینه‌ی «دانلود» را بزنید تا برای پخش آفلاین ذخیره شود."
            />
          ) : (
            downloads.map((d) => (
              <div key={d.id} className="panel flex items-center gap-2 p-2">
                <Artwork
                  track={d.track}
                  size={100}
                  className="size-12 shrink-0"
                  rounded="rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="type-body truncate">{d.track.name}</div>
                  <div className="type-footnote truncate text-ios-label-secondary">
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
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ios-fill">
                      <div
                        className="h-full rounded-full bg-ios-tint transition-[width]"
                        style={{ width: `${Math.min(100, Math.round(d.progress * 100))}%` }}
                      />
                    </div>
                  )}
                  <div className="type-footnote mt-1 flex items-center gap-1.5 text-ios-label-secondary">
                    <StatusIcon status={d.status} />
                    {statusLabel(d.status, d.progress)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
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
                      <Play className="size-4" fill="current" strokeWidth={0} />
                    </IconBtn>
                  )}
                  {d.status === "done" && d.blobUrl && (
                    <a
                      href={d.blobUrl}
                      download
                      className="press grid size-9 place-items-center rounded-lg text-ios-label-secondary"
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
            ))
          )}

          {downloads.length > 0 && (
            <p className="type-footnote pb-2 text-center text-ios-label-secondary">
              فایل‌ها روی همین دستگاه ذخیره می‌شوند. برای پاک‌کردن همه، از تنظیمات استفاده کنید.
            </p>
          )}
        </div>
      </Screen>
    </AppShell>
  );
}

function StatusIcon({
  status,
}: {
  status: "queued" | "downloading" | "paused" | "done" | "error";
}) {
  if (status === "done") return <Check className="size-3 text-ios-green" strokeWidth={2.5} />;
  if (status === "error") return <X className="size-3 text-ios-red" strokeWidth={2.5} />;
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
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "press grid size-9 place-items-center rounded-lg",
        primary
          ? "bg-ios-tint text-white"
          : danger
            ? "text-ios-label-secondary hover:bg-ios-fill hover:text-ios-red"
            : "text-ios-label-secondary hover:bg-ios-fill hover:text-ios-label",
      )}
    >
      {children}
    </button>
  );
}
