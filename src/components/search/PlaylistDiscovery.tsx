import { useState } from "react";
import { ListMusic } from "lucide-react";

import { PlaylistCard } from "@/components/music/PlaylistCard";
import { FEATURED_PLAYLISTS, type PlaylistGroup } from "@/lib/featured";

const GROUPS: PlaylistGroup[] = ["همه", "ایرانی", "حال‌وهوا", "موقعیت", "سبک", "بین‌المللی"];

/** Every tile opens a provider playlist with its own track list, not a search. */
export function PlaylistDiscovery() {
  const [activeGroup, setActiveGroup] = useState<PlaylistGroup>("همه");
  const visiblePlaylists =
    activeGroup === "همه"
      ? FEATURED_PLAYLISTS
      : FEATURED_PLAYLISTS.filter((playlist) => playlist.group === activeGroup);

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <h2 className="type-title-2">پلی‌لیست‌ها</h2>
          <p className="type-footnote mt-1 text-ios-label-secondary">
            مجموعه‌های جداگانه با فهرست آهنگ؛ وارد هرکدام شوید تا آهنگ‌ها را ببینید و پخش کنید.
          </p>
        </div>
        <ListMusic className="size-5 text-ios-tint" aria-hidden />
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="دسته‌بندی پلی‌لیست‌ها">
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
