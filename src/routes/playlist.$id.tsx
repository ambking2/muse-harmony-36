import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { useLibrary } from "@/stores/library";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayer } from "@/stores/player";
import { Music, Pencil, Play, Shuffle, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trackKey } from "@/lib/types";
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
      <Screen title="پلی‌لیست" back={{ to: "/library" }} largeTitle={false}>
        <div className="space-y-5 pt-2">
          <div className="flex flex-wrap items-end gap-5">
            <div className="media-tile grid w-36 shrink-0 place-items-center bg-gradient-to-br from-ios-tint/70 to-ios-indigo/40 sm:w-40">
              <Music className="size-14 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="type-footnote text-ios-label-secondary">پلی‌لیست</p>
              {renaming ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={(e) => e.key === "Enter" && submitRename()}
                  className="type-title-1 mt-1 w-full rounded-xl bg-ios-fill px-3 py-1.5 outline-none ring-1 ring-ios-separator focus:ring-2 focus:ring-ios-tint"
                />
              ) : (
                <h1 className="type-title-1 mt-1">{playlist.name}</h1>
              )}
              <p className="type-footnote mt-1 text-ios-label-secondary ltr-nums">
                {tracks.length.toLocaleString("fa-IR")} آهنگ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => tracks.length && playQueue(tracks, 0)}
              disabled={!tracks.length}
              className="btn btn-filled"
            >
              <Play className="size-4 fill-current" strokeWidth={0} />
              پخش
            </button>
            <button
              type="button"
              onClick={() => {
                playQueue(tracks, 0);
                toggleShuffle();
              }}
              disabled={!tracks.length}
              className="btn btn-gray"
            >
              <Shuffle className="size-4" strokeWidth={2} />
              تصادفی
            </button>
            <button
              type="button"
              onClick={() => {
                setName(playlist.name);
                setRenaming(true);
              }}
              className="btn btn-gray"
            >
              <Pencil className="size-4" strokeWidth={2} />
              تغییر نام
            </button>
            <SharePlaylist playlistId={playlist.id} name={playlist.name} tracks={tracks} />
            <button
              type="button"
              onClick={() => {
                if (confirm(`پلی‌لیست «${playlist.name}» حذف شود؟`)) {
                  del(playlist.id);
                  toast.success("پلی‌لیست حذف شد");
                }
              }}
              className="btn btn-gray text-ios-red"
            >
              <Trash2 className="size-4" strokeWidth={2} />
              حذف
            </button>
          </div>

          <div className="space-y-1">
            {tracks.length === 0 && (
              <p className="type-subheadline rounded-card border border-dashed border-ios-separator p-8 text-center text-ios-label-secondary">
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
                className={cn(
                  "group relative rounded-xl transition",
                  dragIdx === i && "opacity-40",
                )}
              >
                <TrackRow track={t} list={tracks} index={i} showIndex playlistId={playlist.id} />
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
                    remove(playlist.id, trackKey(t));
                    toast.success("آهنگ حذف شد");
                  }}
                  className="absolute left-12 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-ios-surface/90 p-2 text-muted-foreground opacity-80 shadow-sm transition hover:text-destructive hover:opacity-100"
                  aria-label="حذف از پلی‌لیست"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {tracks.length > 0 && (
            <p className="type-footnote text-center text-ios-label-secondary">
              برای جابه‌جایی آهنگ‌ها، کارت‌ها را بکشید یا از فلش‌های کنار هر ردیف استفاده کنید.
            </p>
          )}
        </div>
      </Screen>
    </AppShell>
  );
}
