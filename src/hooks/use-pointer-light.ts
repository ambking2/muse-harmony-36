import { useEffect } from "react";

/**
 * A light that follows the pointer.
 *
 * Apple's glass catches whatever is in front of it, so the highlight on a bar
 * slides with the cursor. On the web that means the surface has to know where
 * the pointer is: this publishes it once per frame as `--mx` / `--my` on the
 * root element, in client pixels — which is exactly what the viewport-fixed
 * chrome (nav bar, tab bar, mini player) needs, since their box is the
 * viewport's box. CSS reads the variables; no component re-renders.
 *
 * Bound to one listener for the whole app, throttled to an animation frame,
 * and only where a hovering pointer exists at all — a touch screen has no
 * cursor to follow and would just pay for the updates.
 */
export function usePointerLight(): void {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const root = document.documentElement;
    let frame = 0;

    const move = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty("--mx", `${event.clientX}px`);
        root.style.setProperty("--my", `${event.clientY}px`);
      });
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
