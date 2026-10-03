import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { HomeHero } from "@/components/home/HomeHero";
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
 * One screen, five things: what the app is, what is playing right now, what to
 * listen to next, what was just played, and where the rest of the library lives.
 * Sections are grouped lists and tiles rather than full-height scrolling
 * panels, so the first screen still shows something useful on a phone.
 */
function Home() {
  return (
    <AppShell>
      <Screen title="خانه" subtitle="موسیقی ایرانی و جهانی">
        <HomeHero />
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
