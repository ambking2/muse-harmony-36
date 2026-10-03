import type { Transition, Variants } from "framer-motion";

/**
 * The app's motion vocabulary.
 *
 * Apple's UI never snaps and never drifts: controls settle on a spring, sheets
 * slide on a decelerating curve, and nothing takes longer than it needs to.
 * Every animated component pulls its timing from here — the whole point is
 * that a tap in the tab bar and a tap in a track row are the same motion.
 *
 * Four springs and two easings, because there are four real speeds in the app:
 * something under the finger (`snappy`), content arriving (`standard`), a
 * large surface unfolding (`gentle`), and a shared element changing size
 * (`morph`, the one allowed to overshoot a little, because overshoot is what
 * reads as *carried* rather than *cut*).
 *
 * Everything here animates only `transform` and `opacity`. Those are the two
 * properties a compositor can handle without asking layout for a new frame,
 * which is the whole reason the app still holds 60fps on a phone with a
 * backdrop-filter on screen.
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

/**
 * Shared elements: the tab indicator travelling, the artwork growing into the
 * player. The only transition with room to overshoot, because an object that
 * is visibly carried into place reads as one object rather than two.
 */
export const morph: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 28,
  mass: 0.8,
};

/** Fades and cross-dissolves, where a spring would wobble. */
export const crossfade: Transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] };

/** Content replacing content inside one frame — a track title, a queue row. */
export const swap: Transition = { duration: 0.18, ease: [0.32, 0.72, 0, 1] };

/** Matches the `press` utility in styles.css, for components animating in JS. */
export const pressScale = 0.965;

/** Touch feedback for a control. Scale only, so nothing reflows. */
export const pressable: Variants = {
  rest: { scale: 1 },
  pressed: { scale: pressScale, transition: snappy },
};

/** The same, as props rather than variants — for elements that are not animated
 *  otherwise and should not pay for a variants object. */
export const whilePress = { scale: pressScale } as const;

/**
 * A page arriving.
 *
 * Deliberately short and small. Navigation should feel like turning a page, not
 * like being pushed: eight pixels of travel and a fifth of a second. Anything
 * longer reads as the app thinking, and the user has to wait for the interface
 * to admit that it has arrived.
 */
export const page: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { ...standard, opacity: { duration: 0.16 } } },
};

/** An overlay: sheets, menus, dialogs. Slides from the edge it belongs to. */
export const sheet: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: standard },
  exit: { opacity: 0, y: 20, scale: 0.99, transition: crossfade },
};

/** A popover or menu, dropping from its trigger. */
export const popover: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: snappy },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } },
};

/**
 * Two states swapping in place: play/pause, play/shuffle, a track title
 * changing. The outgoing one leaves upward and the incoming one arrives from
 * below, so the eye reads it as the same line changing its content.
 */
export const swapLine: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: swap },
  exit: { opacity: 0, y: -10, transition: { duration: 0.12 } },
};

/** An icon swapping between two glyphs on the same button. */
export const swapIcon: Variants = {
  hidden: { opacity: 0, scale: 0.7, rotate: -12 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: snappy },
  exit: { opacity: 0, scale: 0.7, rotate: 12, transition: { duration: 0.12 } },
};

/** Shared entrance for a list or card rail: rise once, never re-run. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...standard, delay },
  }),
};

/**
 * A list that assembles itself.
 *
 * The parent owns the rhythm and the children own nothing: `staggerChildren`
 * makes the delay a function of position, so adding a row never means editing
 * an index. The step saturates for the same reason the `Reveal` component's
 * does — a hundred-track queue that takes four seconds to finish appearing is
 * a wait, not an entrance.
 */
export const stagger = (step = 0.035, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren } },
});

/** One child of a staggered list. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...standard, delay: Math.min(index, 10) * 0.035 },
  }),
};
