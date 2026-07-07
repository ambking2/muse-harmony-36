import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { Download, Heart, ListMusic, Music, Settings } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const library = useLibrary((s) => s.library);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const downloads = useLibrary((s) => s.downloads);

  const stats = [
    { icon: Music, label: "Songs", value: library.length },
    { icon: Heart, label: "Favorites", value: favorites.length },
    { icon: ListMusic, label: "Playlists", value: playlists.length },
    { icon: Download, label: "Downloads", value: downloads.length },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="glass flex size-20 items-center justify-center rounded-full text-3xl font-bold text-primary">
            M
          </div>
          <div>
            <h1 className="text-2xl font-bold">You</h1>
            <p className="text-sm text-muted-foreground">Local profile — everything stays on this device.</p>
          </div>
          <Link to="/settings" className="glass ml-auto flex size-11 items-center justify-center rounded-full">
            <Settings className="size-5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <s.icon className="size-5 text-primary" />
              <div className="mt-3 text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-4">
          <h2 className="font-semibold">Keyboard shortcuts</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li><kbd className="rounded bg-white/10 px-1.5">Space</kbd> Play / Pause</li>
            <li><kbd className="rounded bg-white/10 px-1.5">←</kbd> / <kbd className="rounded bg-white/10 px-1.5">→</kbd> Seek 5s (Shift for prev/next)</li>
            <li><kbd className="rounded bg-white/10 px-1.5">↑</kbd> / <kbd className="rounded bg-white/10 px-1.5">↓</kbd> Volume</li>
            <li><kbd className="rounded bg-white/10 px-1.5">S</kbd> Shuffle · <kbd className="rounded bg-white/10 px-1.5">R</kbd> Repeat · <kbd className="rounded bg-white/10 px-1.5">M</kbd> Mute</li>
            <li><kbd className="rounded bg-white/10 px-1.5">⌘/Ctrl+K</kbd> Command palette</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}