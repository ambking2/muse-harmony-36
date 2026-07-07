import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { QUALITIES, SOURCES } from "@/lib/gdmusic";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const quality = usePlayer((s) => s.quality);
  const setQuality = usePlayer((s) => s.setQuality);
  const sleepAt = usePlayer((s) => s.sleepAt);
  const setSleep = usePlayer((s) => s.setSleepMinutes);
  const rate = usePlayer((s) => s.playbackRate);
  const setRate = usePlayer((s) => s.setPlaybackRate);
  const clearSearch = useLibrary((s) => s.clearSearchHistory);

  const remaining = sleepAt ? Math.max(0, Math.ceil((sleepAt - Date.now()) / 60000)) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

        <Card title="Playback quality">
          <div className="flex flex-wrap gap-2">
            {QUALITIES.map((q) => (
              <button
                key={q.br}
                onClick={() => setQuality(q.br)}
                className={"rounded-full px-4 py-2 text-sm " + (quality === q.br ? "bg-primary text-primary-foreground" : "glass")}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Higher quality uses more data. FLAC only when the source provides it.</p>
        </Card>

        <Card title="Playback speed">
          <div className="flex flex-wrap gap-2">
            {[0.75, 1, 1.25, 1.5, 2].map((r) => (
              <button
                key={r}
                onClick={() => setRate(r)}
                className={"rounded-full px-4 py-2 text-sm " + (rate === r ? "bg-primary text-primary-foreground" : "glass")}
              >
                {r}x
              </button>
            ))}
          </div>
        </Card>

        <Card title="Sleep timer">
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => { setSleep(m); toast.success(`Sleep in ${m} min`); }}
                className="glass rounded-full px-4 py-2 text-sm"
              >
                {m} min
              </button>
            ))}
            <button onClick={() => setSleep(null)} className="rounded-full px-4 py-2 text-sm text-destructive">
              Off
            </button>
          </div>
          {sleepAt && <p className="mt-2 text-xs text-muted-foreground">Pauses in ~{remaining} min.</p>}
        </Card>

        <Card title="Sources">
          <p className="text-sm text-muted-foreground">
            Data provided by gdmusic — {SOURCES.map((s) => s.label).join(", ")}.
          </p>
        </Card>

        <Card title="Data">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { clearSearch(); toast.success("Search history cleared"); }} className="glass rounded-full px-4 py-2 text-sm">
              Clear search history
            </button>
            <button
              onClick={() => {
                if (!confirm("Erase library, favorites, playlists and history?")) return;
                localStorage.removeItem("muis-library");
                window.location.reload();
              }}
              className="rounded-full px-4 py-2 text-sm text-destructive"
            >
              Reset all data
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}