import { Music, Play, SearchX } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/ios/EmptyState";
import { Section } from "@/components/ios/Section";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayer } from "@/stores/player";
import type { Playlist, Track } from "@/lib/types";
import { trackKey } from "@/lib/types";

/** The saved songs, with a single control to play them all. */
export function SongsTab({ songs, filtering }: { songs: Track[]; filtering: boolean }) {
  const playQueue = usePlayer((state) => state.playQueue);

  if (!songs.length) {
    return (
      <EmptyState
        icon={filtering ? SearchX : Music}
        title={filtering ? "نتیجه‌ای پیدا نشد" : "کتابخانه خالی است"}
        description={
          filtering
            ? "عبارت دیگری را امتحان کنید یا فیلتر را پاک کنید."
            : "از منوی هر آهنگ، «افزودن به کتابخانه» را بزنید تا اینجا ذخیره شود."
        }
      />
    );
  }

  return (
    <>
      {songs.length > 1 && (
        <button
          type="button"
          onClick={() => playQueue(songs, 0)}
          className="btn btn-filled mb-4 w-full"
        >
          <Play className="size-4 fill-current" strokeWidth={0} />
          پخش همه
        </button>
      )}
      <Section title={`${songs.length.toLocaleString("fa-IR")} آهنگ`}>
        {songs.map((track, index) => (
          <TrackRow key={trackKey(track)} track={track} list={songs} index={index} showIndex />
        ))}
      </Section>
    </>
  );
}

/** Playlists the listener made, as square tiles like any other collection. */
export function PlaylistsTab({ playlists }: { playlists: Playlist[] }) {
  if (!playlists.length) {
    return (
      <EmptyState
        icon={Music}
        title="هنوز پلی‌لیستی نساخته‌اید"
        description="از دکمه‌ی بالای صفحه یک پلی‌لیست تازه بسازید، یا از منوی هر آهنگ آن را به یکی اضافه کنید."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
      {playlists.map((playlist) => (
        <Link
          key={playlist.id}
          to="/playlist/$id"
          params={{ id: playlist.id }}
          className="panel press block overflow-hidden text-right"
        >
          <div className="media-tile grid place-items-center bg-gradient-to-br from-ios-tint/70 to-ios-indigo/40">
            <Music className="size-8 text-white" strokeWidth={1.5} />
          </div>
          <div className="p-3">
            <div className="type-headline truncate">{playlist.name}</div>
            <div className="type-footnote mt-0.5 text-ios-label-secondary">
              {playlist.trackKeys.length.toLocaleString("fa-IR")} آهنگ
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
