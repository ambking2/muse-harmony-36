import { useEffect } from "react";
import { usePlayer } from "@/stores/player";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const p = usePlayer.getState();
      switch (e.code) {
        case "Space":
          e.preventDefault();
          p.togglePlay();
          break;
        case "ArrowRight":
          if (e.shiftKey) p.next();
          else p.seek(Math.min(p.duration, p.currentTime + 5));
          break;
        case "ArrowLeft":
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}