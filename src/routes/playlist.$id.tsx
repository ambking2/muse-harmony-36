import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayer } from "@/stores/player";
import { Music, Pencil, Play, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  if (!playlist) {
    return (
      <AppShell>
        <div className="py-16 text-center text-muted-foreground">
          Playlist not found.
          <div className="mt-4">
            <Link to="/library" className="text-primary underline">Back to library</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const tracks = playlist.trackKeys.map((k) => tracksById[k]).filter(Boolean);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end gap-6">
          <div className="glass flex aspect-square size-40 items-center justify-center rounded-3xl">
            <Music className="size-14 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Playlist</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{playlist.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{tracks.length} tracks</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => tracks.length && playQueue(tracks, 0)}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Play className="size-4" /> Play
          </button>
          <button
            onClick={() => {
              const n = window.prompt("New name?", playlist.name);
              if (n) rename(playlist.id, n);
            }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
          >
            <Pencil className="size-4" /> Rename
          </button>
          <button
            onClick={async () => {
              const url = `${window.location.origin}/playlist/${playlist.id}`;
              if (navigator.share) navigator.share({ title: playlist.name, url }).catch(() => {});
              else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
            }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
          >
            <Share2 className="size-4" /> Share
          </button>
          <button
            onClick={() => { if (confirm("Delete playlist?")) del(playlist.id); }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-destructive"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </div>

        <div className="space-y-1">
          {tracks.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              Empty. Add songs from Explore or from the track menu.
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
              className="group relative"
            >
              <TrackRow track={t} list={tracks} index={i} showIndex />
              <button
                onClick={() => remove(playlist.id, playlist.trackKeys[i])}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}