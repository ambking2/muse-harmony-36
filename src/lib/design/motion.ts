import type { Transition, Variants } from "framer-motion";

/**
 * The app's motion vocabulary.
 *
 * Apple's UI never snaps and never drifts: controls settle on a spring, sheets
 * slide on a decelerating curve, and nothing takes longer than it needs to.
 * Every animated component pulls its timing from here — the whole point is
 * that a tap in the tab bar and a tap in a track row are the same motion.
 *
 * Sizes mirror the system values closely enough to feel native, and the two
 * springs cover the two real cases: something the finger is still touching
 * (`snappy`, settles under ~250ms) and something arriving on screen
 * (`standard`, settles under ~400ms).
 */

/** Taps, toggles, selection changes. */
export const snappy: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.7,
};

/** Content appearing, sheets settling, cards lifting in. */
export const standard: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.9,
};

/** Large surfaces — the now-playing artwork, the queue sheet. */
export const gentle: Transition = {
  type: "spring",
  stiffness: 190,
  damping: 26,
  mass: 1,
};

/** Fades and cross-dissolves, where a spring would wobble. */
export const crossfade: Transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] };

/** Matches the `press` utility in styles.css, for components animating in JS. */
export const pressScale = 0.965;

/** Shared entrance for a list or card rail: rise once, never re-run. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...standard, delay },
  }),
};
