import { useEffect } from "react";
import { usePlayer } from "@/stores/player";

/**
 * Global playback shortcuts. Ignored while the user is typing so the shortcuts
 * never fight the search box or a dialog.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      // Let the browser and the command palette own ⌘/Ctrl combos.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // A modal is open — only space is safe to intercept.
      if (document.querySelector('[role="dialog"][data-state="open"]') && e.code !== "Space") {
        return;
      }

      const p = usePlayer.getState();
      switch (e.code) {
        case "Space":
          e.preventDefault();
          p.togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) p.next();
          else p.seek(Math.min(p.duration, p.currentTime + 5));
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) p.prev();
          else p.seek(Math.max(0, p.currentTime - 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          p.setVolume(Math.min(1, p.volume + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          p.setVolume(Math.max(0, p.volume - 0.05));
          break;
        case "KeyM":
          p.toggleMute();
          break;
        case "KeyS":
          p.toggleShuffle();
          break;
        case "KeyR":
          p.cycleRepeat();
          break;
        case "KeyL":
          p.setSleepMinutes(p.sleepAt ? null : 30);
          break;
        case "BracketLeft":
          p.setPlaybackRate(Math.max(0.5, Math.round((p.playbackRate - 0.25) * 100) / 100));
          break;
        case "BracketRight":
          p.setPlaybackRate(Math.min(2, Math.round((p.playbackRate + 0.25) * 100) / 100));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
