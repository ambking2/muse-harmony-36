import { ListMusic } from "lucide-react";

import { PlaylistCard } from "@/components/music/PlaylistCard";
import { FEATURED_PLAYLISTS } from "@/lib/featured";

/** Every tile opens a provider playlist with a real track list, not a search. */
export function PlaylistDiscovery() {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <h2 className="type-title-2">پلی‌لیست‌ها</h2>
          <p className="type-footnote mt-1 text-ios-label-secondary">
            وارد هر مجموعه شوید تا آهنگ‌های آن را ببینید و پخش کنید.
          </p>
        </div>
        <ListMusic className="size-5 text-ios-tint" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3">
        {FEATURED_PLAYLISTS.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}
