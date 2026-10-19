import {
  CARD_GAP,
  CARD_HEIGHT,
  CARD_MARGIN,
  CARD_MAX_WIDTH,
  CANVAS_PADDING,
  DROP_GROW_POWER,
  DROP_GROW_SPAN,
  DROP_SIZE,
  DROP_STRETCH,
  EDGE_MARGIN,
  ISLAND_HEIGHT,
  ISLAND_MIN_TOP,
  ISLAND_TOP,
  ISLAND_WIDTH,
  NECK_BREAK,
  NECK_FALL,
  NECK_RISE,
  NECK_WIDTH,
} from "./constants";

/**
 * The island's geometry, as pure functions.
 *
 * Ported line for line from the original repository (`get-notification-layout`
 * and `build-notification-geometry`), so the droplet falls, stretches into a
 * neck and settles into the card with the same timings and the same
 * proportions as the native version. Being pure and dependency-free, the whole
 * shape of the animation can be checked without a browser — see the test file
 * next to this one.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation, `t` usually a 0..1 progress. */
export function mix(t: number, from: number, to: number): number {
  return from + (to - from) * t;
}

export function easeOutPower(progress: number, power: number): number {
  const normalized = clamp(progress, 0, 1);
  return 1 - Math.pow(1 - normalized, power);
}

/**
 * How fat the neck between the island and the droplet is at a given progress.
 * Peaks at `rise / (rise + fall)` and is normalised so the peak is exactly 1,
 * which is what makes the neck's thickness independent of the two exponents.
 */
export function neckProfile(progress: number, rise: number, fall: number): number {
  const t = clamp(progress, 0, 1);
  if (t <= 0 || t >= 1) return 0;
  const peak = rise / (rise + fall);
  const normal = Math.pow(peak, rise) * Math.pow(1 - peak, fall);
  return (Math.pow(t, rise) * Math.pow(1 - t, fall)) / normal;
}

export interface NotificationLayout {
  width: number;
  centerX: number;
  islandWidth: number;
  islandHeight: number;
  islandTop: number;
  islandBottom: number;
  islandRadius: number;
  cardWidth: number;
  cardHeight: number;
  cardRadius: number;
  cardTop: number;
  cardLeft: number;
  cardCenterY: number;
  dropSize: number;
  neckWidth: number;
  canvasHeight: number;
}

export function getNotificationLayout({
  width,
  insetTop,
  islandWidth,
  islandHeight,
  islandTop,
  cardWidth,
  cardHeight,
  cardRadius,
  gap,
}: {
  width: number;
  /** Room the top of the screen needs before anything is drawn. 0 on the web. */
  insetTop: number;
  islandWidth?: number;
  islandHeight?: number;
  islandTop?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardRadius?: number;
  gap?: number;
}): NotificationLayout {
  const pillWidth = islandWidth ?? ISLAND_WIDTH;
  const pillHeight = islandHeight ?? ISLAND_HEIGHT;
  const pillTop = islandTop ?? Math.max(insetTop - pillHeight - ISLAND_TOP, ISLAND_MIN_TOP);
  const pillBottom = pillTop + pillHeight;
  const bodyWidth = cardWidth ?? Math.min(width - CARD_MARGIN * 2, CARD_MAX_WIDTH);
  const bodyHeight = cardHeight ?? CARD_HEIGHT;
  const bodyTop = pillBottom + (gap ?? CARD_GAP);

  return {
    width,
    centerX: width / 2,
    islandWidth: pillWidth,
    islandHeight: pillHeight,
    islandTop: pillTop,
    islandBottom: pillBottom,
    islandRadius: pillHeight / 2,
    cardWidth: bodyWidth,
    cardHeight: bodyHeight,
    cardRadius: cardRadius ?? bodyHeight / 2,
    cardTop: bodyTop,
    cardLeft: (width - bodyWidth) / 2,
    cardCenterY: bodyTop + bodyHeight / 2,
    dropSize: DROP_SIZE,
    neckWidth: NECK_WIDTH,
    canvasHeight: bodyTop + bodyHeight + CANVAS_PADDING,
  };
}

export interface NotificationGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  neckX: number;
  neckY: number;
  neckWidth: number;
  neckHeight: number;
  neckRadius: number;
  shadowOpacity: number;
  /** How far the card still has to travel to its resting place. */
  offsetY: number;
  /** Above 1 while the droplet is wider than the card, which gives the
   *  content its small overshoot as it settles. */
  widthRatio: number;
}

/**
 * `drop` is the fall from the island (0..1) and `expand` the morph from a
 * droplet into the card (0..1). Everything drawn is a function of the two.
 */
export function buildNotificationGeometry({
  drop,
  expand,
  layout,
}: {
  drop: number;
  expand: number;
  layout: NotificationLayout;
}): NotificationGeometry {
  const grow = easeOutPower(clamp(drop / DROP_GROW_SPAN, 0, 1), DROP_GROW_POWER);
  const neck = neckProfile(drop / NECK_BREAK, NECK_RISE, NECK_FALL);
  const stretch = 1 + DROP_STRETCH * neck;
  const droplet = layout.dropSize * grow;

  const width = Math.min(
    mix(expand, droplet / stretch, layout.cardWidth),
    layout.width - EDGE_MARGIN * 2,
  );
  const height = mix(expand, droplet * stretch, layout.cardHeight);
  const radius = Math.min(
    mix(expand, droplet * 0.5, layout.cardRadius),
    Math.min(width, height) / 2,
  );

  const originY = layout.islandBottom - layout.islandHeight * 0.34;
  const centerY = mix(drop, originY, layout.cardCenterY);
  const neckWidth = Math.min(layout.neckWidth, width) * neck;
  const neckY = layout.islandBottom - layout.islandHeight * 0.5;

  return {
    x: layout.centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    radius,
    neckX: layout.centerX - neckWidth / 2,
    neckY,
    neckWidth,
    neckHeight: Math.max(centerY - neckY, 0),
    neckRadius: neckWidth / 2,
    shadowOpacity: clamp(expand, 0, 1),
    offsetY: centerY - layout.cardCenterY,
    widthRatio: layout.cardWidth > 0 ? width / layout.cardWidth : 0,
  };
}

/** The card's own transform: a slight scale-up from 0.88 plus any overshoot. */
export function contentScale(reveal: number, widthRatio: number): number {
  const progress = clamp(reveal, 0, 1);
  const overshoot = clamp(widthRatio - 1, 0, 0.2);
  return mix(progress, 0.88, 1) + overshoot * progress;
}
