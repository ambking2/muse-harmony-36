import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, BackLink } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayer } from "@/stores/player";
import { Music, Pencil, Play, Shuffle, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SharePlaylist } from "@/components/music/SharePlaylist";

export const Route = createFileRoute("/playlist/$id")({ component: PlaylistPage });

function PlaylistPage() {
  const { id } = Route.useParams();
  const playlist = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const tracksById = useLibrary((s) => s.tracksById);
  const rename = useLibrary((s) => s.renamePlaylist);
  const del = useLibrary((s) => s.deletePlaylist);
  const remove = useLibrary((s) => s.removeFromPlaylist);
  const reorder = useLibrary((s) => s.reorderPlaylist);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(playlist?.name ?? "");

  if (!playlist) {
    return (
      <AppShell>
        <div className="py-16 text-center">
          <p className="text-muted-foreground">این پلی‌لیست پیدا نشد.</p>
          <Link to="/library" className="mt-4 inline-block text-primary underline">
            بازگشت به کتابخانه
          </Link>
        </div>
      </AppShell>
    );
  }

  const tracks = playlist.trackKeys.map((k) => tracksById[k]).filter(Boolean);

  const submitRename = () => {
    const next = name.trim();
    if (next && next !== playlist.name) {
      rename(playlist.id, next);
      toast.success("نام پلی‌لیست تغییر کرد");
    }
    setRenaming(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <BackLink />

        <div className="flex flex-wrap items-end gap-6">
          <div className="glass flex aspect-square w-36 shrink-0 items-center justify-center rounded-3xl sm:w-40">
            <Music className="size-14 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">پلی‌لیست</p>
            {renaming ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => e.key === "Enter" && submitRename()}
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-1.5 text-2xl font-black tracking-tight outline-none ring-1 ring-white/10 focus:ring-primary/60 sm:text-4xl"
              />
            ) : (
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {playlist.name}
              </h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground ltr-nums">
              {tracks.length.toLocaleString("fa-IR")} آهنگ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => tracks.length && playQueue(tracks, 0)}
            disabled={!tracks.length}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 disabled:opacity-40"
          >
            <Play className="size-4" /> پخش
          </button>
          <button
            onClick={() => {
              playQueue(tracks, 0);
              toggleShuffle();
            }}
            disabled={!tracks.length}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition active:scale-95 disabled:opacity-40"
          >
            <Shuffle className="size-4" /> تصادفی
          </button>
          <button
            onClick={() => {
              setName(playlist.name);
              setRenaming(true);
            }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
          >
            <Pencil className="size-4" /> تغییر نام
          </button>
          <SharePlaylist playlistId={playlist.id} name={playlist.name} tracks={tracks} />
          <button
            onClick={() => {
              if (confirm(`پلی‌لیست «${playlist.name}» حذف شود؟`)) {
                del(playlist.id);
                toast.success("پلی‌لیست حذف شد");
              }
            }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-destructive"
          >
            <Trash2 className="size-4" /> حذف
          </button>
        </div>

        <div className="space-y-1">
          {tracks.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              این پلی‌لیست خالی است. از صفحه‌ی جستجو یا منوی هر آهنگ اضافه کنید.
            </p>
          )}
          {tracks.map((t, i) => (
            <div
              key={playlist.trackKeys[i]}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== i) reorder(playlist.id, dragIdx, i);
                setDragIdx(null);
              }}
              onDragEnd={() => setDragIdx(null)}
              className={cn("group relative rounded-xl transition", dragIdx === i && "opacity-40")}
            >
              <TrackRow track={t} list={tracks} index={i} showIndex />
              {/* Drag works on desktop; these buttons are the touch equivalent. */}
              <div className="absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 opacity-0 transition group-hover:opacity-100 max-md:opacity-100">
                <button
                  onClick={() => reorder(playlist.id, i, i - 1)}
                  disabled={i === 0}
                  aria-label="بالا"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-white/10 disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  onClick={() => reorder(playlist.id, i, i + 1)}
                  disabled={i === tracks.length - 1}
                  aria-label="پایین"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-white/10 disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
              <button
                onClick={() => {
                  remove(playlist.id, playlist.trackKeys[i]);
                  toast.success("آهنگ حذف شد");
                }}
                className="absolute left-12 top-1/2 hidden -translate-y-1/2 rounded-full p-2 text-muted-foreground transition hover:text-destructive group-hover:block"
                aria-label="حذف از پلی‌لیست"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {tracks.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            برای جابه‌جایی آهنگ‌ها، کارت‌ها را بکشید یا از فلش‌های کنار هر ردیف استفاده کنید.
          </p>
        )}
      </div>
    </AppShell>
  );
}
