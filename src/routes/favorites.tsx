import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { TrackRow } from "@/components/music/TrackRow";
import { trackKey } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { Heart, Play, Shuffle, Mic2, Music } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "songs", label: "آهنگ‌ها", icon: Music },
  { id: "artists", label: "خواننده‌ها", icon: Mic2 },
] as const;

export const Route = createFileRoute("/favorites")({ component: FavoritesPage });

function FavoritesPage() {
  const favorites = useLibrary((s) => s.favorites);
  const tracksById = useLibrary((s) => s.tracksById);
  const favArtists = useLibrary((s) => s.favoriteArtists);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const [tab, setTab] = useState<"songs" | "artists">("songs");

  const tracks = favorites.map((k) => tracksById[k]).filter(Boolean);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="دوست‌داشتنی‌ها"
          title="علاقه‌مندی‌ها"
          action={
            tracks.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    playQueue(tracks, 0);
                    toggleShuffle();
                  }}
                  className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                >
                  <Shuffle className="size-4" /> تصادفی
                </button>
                <button
                  onClick={() => playQueue(tracks, 0)}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
                >
                  <Play className="size-4" /> پخش همه
                </button>
              </div>
            )
          }
        />

        <div className="glass inline-flex rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "songs" &&
          (tracks.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Heart className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                هنوز آهنگی را نشان نکرده‌اید — روی قلب هر آهنگ بزنید.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {tracks.map((t, i) => (
                <TrackRow key={trackKey(t)} track={t} list={tracks} index={i} showIndex />
              ))}
            </div>
          ))}

        {tab === "artists" &&
          (favArtists.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
              <Mic2 className="mx-auto size-10" />
              <p className="mt-3 text-sm">هنوز خواننده‌ی محبوبی انتخاب نکرده‌اید.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {favArtists.map((a) => (
                <Link
                  key={a}
                  to="/artist/$name"
                  params={{ name: a }}
                  className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:bg-white/10"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Mic2 className="size-5" />
                  </div>
                  <div className="truncate font-medium">{a}</div>
                </Link>
              ))}
            </div>
          ))}
      </div>
    </AppShell>
  );
}
