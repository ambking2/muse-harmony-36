import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { TrackRow } from "@/components/music/TrackRow";
import { trackKey } from "@/lib/types";
import { Plus, Music, Clock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/library")({ component: LibraryPage });

function LibraryPage() {
  const library = useLibrary((s) => s.library);
  const playlists = useLibrary((s) => s.playlists);
  const history = useLibrary((s) => s.history);
  const tracksById = useLibrary((s) => s.tracksById);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const [tab, setTab] = useState<"songs" | "playlists" | "history">("songs");

  const recent = history.slice(0, 30).map((h) => tracksById[h.key]).filter(Boolean);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Library</h1>
          <button
            onClick={() => {
              const n = window.prompt("Playlist name?");
              if (n) createPlaylist(n);
            }}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> New playlist
          </button>
        </div>

        <div className="glass inline-flex rounded-full p-1">
          {(["songs", "playlists", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "rounded-full px-4 py-1.5 text-sm capitalize transition " +
                (tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "songs" && (
          <div className="space-y-1">
            {library.length === 0 ? (
              <Empty icon={<Music className="size-8" />} text="No songs saved. Add tracks from Explore." />
            ) : (
              library.map((t, i) => (
                <TrackRow key={trackKey(t)} track={t} list={library} index={i} showIndex />
              ))
            )}
          </div>
        )}

        {tab === "playlists" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {playlists.length === 0 && <Empty icon={<Music className="size-8" />} text="No playlists yet." />}
            {playlists.map((p) => (
              <Link
                key={p.id}
                to="/playlist/$id"
                params={{ id: p.id }}
                className="glass rounded-2xl p-4"
              >
                <div className="mb-3 flex aspect-square items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Music className="size-8" />
                </div>
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.trackKeys.length} tracks</div>
              </Link>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-1">
            {recent.length === 0 ? (
              <Empty icon={<Clock className="size-8" />} text="Nothing played yet." />
            ) : (
              recent.map((t, i) => <TrackRow key={`${trackKey(t)}-${i}`} track={t} list={recent} index={i} />)
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground">
      <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-white/5">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}