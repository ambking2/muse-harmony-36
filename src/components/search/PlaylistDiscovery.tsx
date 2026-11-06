import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListMusic } from "lucide-react";

import { PlaylistCard } from "@/components/music/PlaylistCard";
import { FEATURED_PLAYLISTS, type PlaylistGroup } from "@/lib/featured";

const GROUPS: PlaylistGroup[] = [
  "همه",
  "ایرانی",
  "سبک",
  "بین‌المللی",
];

/** Each card opens a provider playlist and loads its actual track list. */
export function PlaylistDiscovery() {
  const [activeGroup, setActiveGroup] = useState<PlaylistGroup>("همه");
  const { data } = useQuery({ queryKey: ["featured-playlists"], queryFn: async () => { const response = await fetch("/api/featured-playlists"); if (!response.ok) throw new Error("featured playlists unavailable"); return (await response.json() as { playlists: typeof FEATURED_PLAYLISTS }).playlists; }, staleTime: 60_000 });
  const playlists = data ?? FEATURED_PLAYLISTS;
  const visiblePlaylists = activeGroup === "همه" ? playlists : playlists.filter((playlist) => playlist.group === activeGroup);

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <h2 className="type-title-2">پلی‌لیست‌ها</h2>
          <p className="type-footnote mt-1 text-ios-label-secondary">
            مجموعه‌های واقعی با فهرست آهنگ مستقل؛ وارد هرکدام شوید تا آهنگ‌ها را ببینید و پخش کنید.
          </p>
        </div>
        <ListMusic className="size-5 text-ios-tint" aria-hidden />
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="فیلتر پلی‌لیست‌ها">
        {GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setActiveGroup(group)}
            aria-pressed={activeGroup === group}
            className={`press shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${activeGroup === group ? "bg-ios-tint text-white" : "panel text-ios-label-secondary"}`}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3">
        {visiblePlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}
