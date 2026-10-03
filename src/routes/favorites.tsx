import { createFileRoute } from "@tanstack/react-router";
import { Heart, Mic2, Play, Shuffle } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Row } from "@/components/ios/Row";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { Segmented } from "@/components/ios/Segmented";
import { TrackRow } from "@/components/music/TrackRow";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { trackKey } from "@/lib/types";

export const Route = createFileRoute("/favorites")({ component: FavoritesPage });

const TABS = [
  { value: "songs", label: "آهنگ‌ها" },
  { value: "artists", label: "خواننده‌ها" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/** Everything the listener has hearted — the songs, and the voices behind them. */
function FavoritesPage() {
  const favorites = useLibrary((state) => state.favorites);
  const tracksById = useLibrary((state) => state.tracksById);
  const favoriteArtists = useLibrary((state) => state.favoriteArtists);
  const playQueue = usePlayer((state) => state.playQueue);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);

  const [tab, setTab] = useState<Tab>("songs");
  const tracks = favorites.map((key) => tracksById[key]).filter(Boolean);

  return (
    <AppShell>
      <Screen
        title="علاقه‌مندی‌ها"
        subtitle={
          favorites.length
            ? `${favorites.length.toLocaleString("fa-IR")} آهنگ و ${favoriteArtists.length.toLocaleString("fa-IR")} خواننده`
            : "هنوز چیزی را نشان نکرده‌اید"
        }
      >
        <Segmented value={tab} onChange={setTab} options={TABS} className="mt-4" />

        {tab === "songs" ? (
          <>
            {tracks.length > 0 && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => playQueue(tracks, 0)}
                  className="btn btn-filled flex-1"
                >
                  <Play className="size-4 fill-current" strokeWidth={0} />
                  پخش همه
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playQueue(tracks, 0);
                    toggleShuffle();
                  }}
                  className="btn btn-gray"
                >
                  <Shuffle className="size-4" strokeWidth={2} />
                  تصادفی
                </button>
              </div>
            )}

            <div className="mt-4">
              {tracks.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="هنوز آهنگی را نشان نکرده‌اید"
                  description="روی قلب هر آهنگ بزنید تا اینجا جمع شود — و با حسابتان همگام بماند."
                />
              ) : (
                <Section title="آهنگ‌ها">
                  {tracks.map((track, index) => (
                    <TrackRow
                      key={trackKey(track)}
                      track={track}
                      list={tracks}
                      index={index}
                      showIndex
                    />
                  ))}
                </Section>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4">
            {favoriteArtists.length === 0 ? (
              <EmptyState
                icon={Mic2}
                title="هنوز خواننده‌ای را دنبال نکرده‌اید"
                description="از صفحه‌ی هر خواننده، او را به این فهرست اضافه کنید."
              />
            ) : (
              <Section title="خواننده‌ها">
                {favoriteArtists.map((artist) => (
                  <Row
                    key={artist}
                    icon={Mic2}
                    tone="pink"
                    label={artist}
                    to={`/artist/${encodeURIComponent(artist)}`}
                  />
                ))}
              </Section>
            )}
          </div>
        )}
      </Screen>
    </AppShell>
  );
}
