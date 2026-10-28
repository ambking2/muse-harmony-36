import { useEffect, useState } from "react";

/**
 * Whether the real liquid-glass engine (glisse) should run.
 *
 * The displacement filters sample and re-render the scene every frame — a
 * desktop GPU eats that, a mid-range phone does not. Below the low-power
 * breakpoint the app keeps its cheap frost profile, which is what the
 * performance pass tuned.
 */
export function useLiquid(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 821px)");
    const update = () => setOn(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return on;
}
