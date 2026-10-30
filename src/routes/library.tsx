import { createFileRoute } from "@tanstack/react-router";
import { Clock, History as HistoryIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { CountUp } from "@/components/ios/CountUp";
import { EmptyState } from "@/components/ios/EmptyState";
import { Screen } from "@/components/ios/Screen";
import { SearchField } from "@/components/ios/SearchField";
import { Section } from "@/components/ios/Section";
import { Segmented } from "@/components/ios/Segmented";
import { PlaylistsTab, SongsTab } from "@/components/library/LibraryTabs";
import { NewPlaylistDialog } from "@/components/library/NewPlaylistDialog";
import { TrackRow } from "@/components/music/TrackRow";
import { useLibrary } from "@/stores/library";
import { normalizeFa } from "@/lib/text";
import type { Track } from "@/lib/types";
import { trackKey } from "@/lib/types";

export const Route = createFileRoute("/library")({ component: LibraryPage });

/** One enum for the whole screen, so the segmented control and the content
 *  below it can never disagree about which tab is showing. */
const TABS = [
  { value: "songs", label: "آهنگ‌ها" },
  { value: "playlists", label: "پلی‌لیست‌ها" },
  { value: "history", label: "تاریخچه" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/**
 * Library.
 *
 * Three pages behind one title — the songs you saved, the playlists you made,
 * and where you have been — which is exactly what a segmented control is for.
 * Filtering applies to songs and history, the two lists long enough to need it.
 */
function LibraryPage() {
  const library = useLibrary((state) => state.library);
  const playlists = useLibrary((state) => state.playlists);
  const history = useLibrary((state) => state.history);
  const tracksById = useLibrary((state) => state.tracksById);

  const [tab, setTab] = useState<Tab>("songs");
  const [filter, setFilter] = useState("");

  // Persian-aware local filter, so a half-typed name still matches. Memoised:
  // the list is re-filtered only when the data or the query actually changes,
  // not on every render of the page around it.
  const query = normalizeFa(filter);

  const songs = useMemo(() => {
    if (!query) return library;
    return library.filter(
      (track) =>
        normalizeFa(track.name).includes(query) ||
        track.artist.some((artist) => normalizeFa(artist).includes(query)) ||
        normalizeFa(track.album ?? "").includes(query),
    );
  }, [library, query]);

  const played = useMemo(() => {
    const list = history
      .map((entry) => tracksById[entry.key])
      .filter((track): track is Track => Boolean(track));
    if (!query) return list;
    return list.filter(
      (track) =>
        normalizeFa(track.name).includes(query) ||
        track.artist.some((artist) => normalizeFa(artist).includes(query)),
    );
  }, [history, tracksById, query]);

  const filtering = filter.trim().length > 0;

  return (
    <AppShell>
      <Screen
        title="کتابخانه"
        subtitle={
          library.length ? (
            <>
              <CountUp value={library.length} flash /> آهنگ ذخیره‌شده
            </>
          ) : (
            "هنوز آهنگی ذخیره نکرده‌اید"
          )
        }
        actions={<NewPlaylistDialog />}
      >
        <div className="sticky top-[calc(max(env(safe-area-inset-top),0.75rem)+3.75rem)] z-30 -mx-4 mt-4 space-y-3 border-b border-ios-separator/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
          <Segmented value={tab} onChange={setTab} options={TABS} />
          {(tab === "songs" || tab === "history") && (
            <SearchField
              value={filter}
              onChange={setFilter}
              placeholder={tab === "songs" ? "فیلتر در کتابخانه" : "فیلتر در تاریخچه"}
            />
          )}
        </div>

        <div className="mt-4">
          {tab === "songs" && <SongsTab songs={songs} filtering={filtering} />}
          {tab === "playlists" && <PlaylistsTab playlists={playlists} />}
          {tab === "history" && <HistoryList tracks={played} filtering={filtering} />}
        </div>
      </Screen>
    </AppShell>
  );
}

/** Everything ever played, newest first. */
function HistoryList({ tracks, filtering }: { tracks: Track[]; filtering: boolean }) {
  if (!tracks.length) {
    return (
      <EmptyState
        icon={filtering ? Clock : HistoryIcon}
        title={filtering ? "تاریخچه‌ای با این فیلتر نیست" : "تاریخچه خالی است"}
        description={
          filtering ? "عبارت دیگری را امتحان کنید." : "هر آهنگی که گوش کنید اینجا ثبت می‌شود."
        }
      />
    );
  }

  return (
    <Section title={`${tracks.length.toLocaleString("fa-IR")} آهنگ`}>
      {tracks.map((track, index) => (
        <TrackRow key={`${trackKey(track)}-${index}`} track={track} list={tracks} index={index} />
      ))}
    </Section>
  );
}
