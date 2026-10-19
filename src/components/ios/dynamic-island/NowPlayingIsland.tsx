import { useEffect, useRef } from "react";
import { Pause } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { getPicUrl } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { useDynamicNotifications } from "./context";

/**
 * The island, wired to the player.
 *
 * Every time a track starts, the island announces it the way a phone would:
 * the cover as the avatar, the title, the artists, and a pause glyph on the
 * trailing side while it plays. Tapping opens the player.
 *
 * This subscribes to the store rather than rendering from it on purpose. The
 * player writes its position four times a second, and this component must not
 * re-render on any of those; the only transition it cares about is which track
 * is loaded.
 */
export function NowPlayingIsland() {
  const { trigger } = useDynamicNotifications();
  const navigate = useNavigate();
  // The last track announced, not the last track seen: a queue restored from a
  // previous session is not news, but playing its first song is.
  const announced = useRef<string | null>(null);

  useEffect(() => {
    const announce = (state: ReturnType<typeof usePlayer.getState>) => {
      const track = state.queue[state.index];
      if (!track || !state.isPlaying) return;
      const key = trackKey(track);
      if (key === announced.current) return;
      announced.current = key;

      trigger({
        id: key,
        title: track.name,
        message: track.artist.join("، "),
        // Resolved after the card is up: cover art here comes through a server
        // proxy, so it is never ready at the moment the track starts.
        avatar: track.picUrl ?? getPicUrl(track.source, track.pic_id, 96).catch(() => null),
        symbol: <Pause className="size-6" />,
        duration: 3200,
        onPress: () => void navigate({ to: "/now-playing" }),
      });
    };

    return usePlayer.subscribe(announce);
  }, [navigate, trigger]);

  return null;
}
