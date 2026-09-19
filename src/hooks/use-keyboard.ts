import { useEffect } from "react";
import { usePlayer } from "@/stores/player";

/** Mounted once by AudioEngine so shortcuts also work on Now Playing. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, button, a, [role='slider'], [role='dialog'], [role='combobox'], [role='menu']"))) return;
      const player = usePlayer.getState();
      if (!player.queue.length) return;
      switch (event.code) {
        case "Space":
          event.preventDefault();
          player.togglePlay();
          break;
        case "ArrowRight":
          event.preventDefault();
          if (event.shiftKey) player.next();
          else player.seek(Math.min(player.duration, player.currentTime + 5));
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (event.shiftKey) player.prev();
          else player.seek(Math.max(0, player.currentTime - 5));
          break;
        case "ArrowUp":
          event.preventDefault();
          player.setVolume(player.volume + 0.05);
          break;
        case "ArrowDown":
          event.preventDefault();
          player.setVolume(player.volume - 0.05);
          break;
        case "KeyM": player.toggleMute(); break;
        case "KeyS": player.toggleShuffle(); break;
        case "KeyR": player.cycleRepeat(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
