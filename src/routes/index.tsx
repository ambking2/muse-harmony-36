import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { QuickLinks } from "@/components/home/QuickLinks";
import { ResumeCard } from "@/components/home/ResumeCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { TrackRow } from "@/components/music/TrackRow";
import { FEATURED_PLAYLISTS } from "@/lib/featured";
import { useLibrary } from "@/stores/library";
import { trackKey } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Home.
 *
 * The eyebrow is the date — the cheapest line that says today is real — and
 * under it the screen is one thing after another to hear: what is playing, the
 * provider's own collections, what was just played, and the doors to the rest
 * of the library. Search is not on this screen; it lives in the circular
 * button beside the dock, where the finger already is.
 */
function Home() {
  // «شنبه ۲۷ مهر» — the long Persian date, as the reference's "Fri 3 October".
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );

  return (
    <AppShell>
      <Screen title="خانه" subtitle={today}>
        <ResumeCard />
        <Collections />
        <RecentlyPlayed />
        <QuickLinks />
      </Screen>
    </AppShell>
  );
}

/** The provider's own hand-picked Iranian collections. Local copy, so this
 *  section costs no network calls at all. */
function Collections() {
  return (
    <Section
      title="پلی‌لیست‌های ایرانی"
      action={
        <Link to="/explore" className="type-footnote text-ios-tint">
          همه
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
        {FEATURED_PLAYLISTS.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </Section>
  );
}

/** What the listener actually played, newest first, deduplicated. */
function RecentlyPlayed() {
  const history = useLibrary((state) => state.history);
  const tracksById = useLibrary((state) => state.tracksById);

  // Derived once per history change rather than on every render of the page.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out = [];
    for (const entry of history) {
      if (seen.has(entry.key)) continue;
      const track = tracksById[entry.key];
      if (!track) continue;
      seen.add(entry.key);
      out.push(track);
      if (out.length >= 6) break;
    }
    return out;
  }, [history, tracksById]);

  if (!recent.length) return null;

  return (
    <Section
      title="اخیراً گوش دادید"
      action={
        <Link to="/library" className="type-footnote text-ios-tint">
          کتابخانه
        </Link>
      }
    >
      {recent.map((track) => (
        <TrackRow key={trackKey(track)} track={track} list={recent} />
      ))}
    </Section>
  );
}
