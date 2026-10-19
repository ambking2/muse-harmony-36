/**
 * Dynamic Island notifications — the numbers.
 *
 * Every value here is the same one `expo-dynamic-notifications` uses
 * (src/constants/notification.consts.ts in that repo), including the island's
 * own size and the goo filter's gain and threshold. They are kept as a copy
 * rather than derived so the geometry can be read against the original.
 */

export const ISLAND_WIDTH = 126;
export const ISLAND_HEIGHT = 37.33;
export const ISLAND_TOP = 11;
export const ISLAND_MIN_TOP = 12;
export const CARD_MAX_WIDTH = 396;
export const CARD_HEIGHT = 74;
export const CARD_MARGIN = 16;
export const CARD_GAP = 34;
export const DROP_SIZE = 52;
export const NECK_WIDTH = 60;
export const CANVAS_PADDING = 96;
export const EDGE_MARGIN = 10;

export const GOO_STRENGTH = 0.62;
export const GOO_BLUR_MIN = 5;
export const GOO_BLUR_MAX = 20;
export const GOO_GAIN = 22;
export const GOO_THRESHOLD = 0.43;
export const GOO_INSET_RATIO = 0.26;

export const DROP_GROW_SPAN = 0.7;
export const DROP_GROW_POWER = 1.25;
export const DROP_STRETCH = 0.38;
export const DROP_TINT_START = 0.06;
export const DROP_TINT_END = 0.88;

export const NECK_BREAK = 0.82;
export const NECK_RISE = 1.6;
export const NECK_FALL = 1.4;

export const CONTENT_MIN_SCALE = 0.88;
export const BLUR_INTENSITY = 64;
export const SHADOW_DY = 10;
export const SHADOW_BLUR = 14;

export const ENTER_TINT_DELAY = 110;
export const ENTER_EXPAND_DELAY = 340;
export const ENTER_REVEAL_DELAY = 560;
export const EXIT_COLLAPSE_DELAY = 100;
export const EXIT_DROP_DELAY = 280;

export const AUTO_DISMISS = 3600;
export const SWIPE_DISTANCE = -18;
export const SWIPE_VELOCITY = -420;
export const EXIT_ANTICIPATION_VELOCITY = 2;

/** The original palette (src/conf/palette.ts). The card is white in both
 *  appearances on purpose: it is a system notification, not app chrome, and
 *  it reads the same over a light or a dark page. */
export const PALETTE = {
  island: "#000000",
  card: "#FFFFFF",
  accent: "#2F9BFF",
  message: "#77787D",
  avatar: "#E8E9EB",
  shadow: "rgba(16, 19, 28, 0.20)",
} as const;

/**
 * The springs (src/conf/springs.ts), with Reanimated's `dampingRatio` mapped to
 * framer-motion's `bounce` — 1 is critically damped, which is a bounce of 0 —
 * and milliseconds to seconds, which is what framer takes.
 */
export interface Spring {
  duration: number;
  bounce: number;
}

function spring(durationMs: number, dampingRatio: number): Spring {
  return { duration: durationMs / 1000, bounce: Math.min(1, Math.max(0, 1 - dampingRatio)) };
}

export const DROP_SPRING = spring(1150, 0.82);
export const EXPAND_SPRING = spring(1000, 0.8);
export const REVEAL_SPRING = spring(700, 1);
export const TINT_SPRING = spring(700, 1);
export const COLLAPSE_SPRING = spring(660, 0.92);
export const RETURN_SPRING = spring(1150, 0.9);
export const FADE_SPRING = spring(360, 1);
export const DRAG_SPRING = spring(560, 0.7);
