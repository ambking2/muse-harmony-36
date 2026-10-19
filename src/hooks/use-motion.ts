import { useEffect, useRef } from "react";

import { bindLift, bindMagnetic } from "@/lib/design/motion-gsap";

/**
 * Ref hooks for the pointer effects — magnetic buttons and lift-on-hover.
 *
 * They bind on mount and clean up on unmount, so a component that conditionally
 * renders its element (the mini player) can use them like any ref and pay
 * nothing when the element is gone.
 */

/** The element leans toward the pointer and springs back (Rapport's `po`). */
export function useMagnetic<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => (ref.current ? bindMagnetic(ref.current) : undefined), []);
  return ref;
}

/** The element rises a few pixels under the pointer (Rapport's `ho`). */
export function useLift<T extends HTMLElement>(distance = -4) {
  const ref = useRef<T | null>(null);
  useEffect(() => (ref.current ? bindLift(ref.current, distance) : undefined), [distance]);
  return ref;
}
