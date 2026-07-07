import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { Artwork } from "@/components/music/Artwork";
import { formatBytes } from "@/lib/gdmusic";
import { Download as DownloadIcon, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/downloads")({ component: DownloadsPage });

function DownloadsPage() {
  const downloads = useLibrary((s) => s.downloads);
  const remove = useLibrary((s) => s.removeDownload);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
        {downloads.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            <DownloadIcon className="mx-auto size-10" />
            <p className="mt-3 text-sm">Downloaded songs will appear here.</p>
          </div>
        )}
        <div className="space-y-2">
          {downloads.map((d) => (
            <div key={d.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              <Artwork track={d.track} size={100} className="size-14" rounded="rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.track.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.track.artist.join(", ")} • {d.br === 999 ? "FLAC" : `${d.br} kbps`} {d.size ? `• ${formatBytes(d.size)}` : ""}
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${Math.min(100, Math.round(d.progress * 100))}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{d.status}</div>
              </div>
              {d.blobUrl && (
                <a href={d.blobUrl} download className="rounded-full p-2 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="size-4" />
                </a>
              )}
              <button onClick={() => remove(d.id)} className="rounded-full p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}