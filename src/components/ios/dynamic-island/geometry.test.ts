/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { CARD_GAP, CARD_HEIGHT, DROP_SIZE, ISLAND_MIN_TOP } from "./constants";
import {
  buildNotificationGeometry,
  clamp,
  contentScale,
  easeOutPower,
  getNotificationLayout,
  mix,
  neckProfile,
} from "./geometry";

const layout = getNotificationLayout({ width: 390, insetTop: 0 });

describe("the layout", () => {
  test("puts the island at the top, centred", () => {
    expect(layout.islandTop).toBe(ISLAND_MIN_TOP);
    expect(layout.centerX).toBe(195);
    expect(layout.islandRadius).toBeCloseTo(layout.islandHeight / 2, 5);
  });

  test("leaves the card a gap below the island", () => {
    expect(layout.cardTop).toBeCloseTo(layout.islandBottom + CARD_GAP, 5);
    expect(layout.cardHeight).toBe(CARD_HEIGHT);
    expect(layout.cardLeft).toBeCloseTo((390 - layout.cardWidth) / 2, 5);
  });

  test("never lets the card run past the edge of a narrow screen", () => {
    const narrow = getNotificationLayout({ width: 320, insetTop: 0 });
    expect(narrow.cardWidth).toBe(320 - 32);
    expect(narrow.cardLeft).toBe(16);
  });

  test("reserves room for the canvas below the card", () => {
    expect(layout.canvasHeight).toBeGreaterThan(layout.cardTop + layout.cardHeight);
  });
});

describe("the droplet", () => {
  test("starts as nothing at all", () => {
    const resting = buildNotificationGeometry({ drop: 0, expand: 0, layout });
    expect(resting.width).toBe(0);
    expect(resting.height).toBe(0);
    expect(resting.shadowOpacity).toBe(0);
  });

  test("is a circle of the drop size at the bottom of the fall", () => {
    const fallen = buildNotificationGeometry({ drop: 1, expand: 0, layout });
    expect(fallen.width).toBeCloseTo(DROP_SIZE, 5);
    expect(fallen.height).toBeCloseTo(DROP_SIZE, 5);
    expect(fallen.radius).toBeCloseTo(DROP_SIZE / 2, 5);
  });

  test("hangs from the island as it falls, rather than starting below it", () => {
    const early = buildNotificationGeometry({ drop: 0.1, expand: 0, layout });
    expect(early.y).toBeLessThan(layout.islandBottom);
    expect(early.y + early.height).toBeGreaterThan(layout.islandTop);
  });

  test("swells into the card and lands exactly on it", () => {
    const card = buildNotificationGeometry({ drop: 1, expand: 1, layout });
    expect(card.width).toBeCloseTo(layout.cardWidth, 5);
    expect(card.height).toBeCloseTo(layout.cardHeight, 5);
    expect(card.radius).toBeCloseTo(layout.cardRadius, 5);
    expect(card.offsetY).toBeCloseTo(0, 5);
    expect(card.shadowOpacity).toBe(1);
  });

  test("keeps its corners rounder than half its short side", () => {
    for (let step = 0; step <= 20; step++) {
      const geometry = buildNotificationGeometry({
        drop: step / 20,
        expand: step / 20,
        layout,
      });
      expect(geometry.radius).toBeLessThanOrEqual(
        Math.min(geometry.width, geometry.height) / 2 + 1e-6,
      );
      expect(geometry.radius).toBeGreaterThanOrEqual(0);
    }
  });

  test("never draws wider than the screen", () => {
    const narrow = getNotificationLayout({ width: 300, insetTop: 0 });
    for (let step = 0; step <= 20; step++) {
      const geometry = buildNotificationGeometry({
        drop: step / 20,
        expand: step / 20,
        layout: narrow,
      });
      expect(geometry.width).toBeLessThanOrEqual(300 - 20 + 1e-6);
    }
  });
});

describe("the neck between them", () => {
  test("is nothing before the fall and nothing once it has landed", () => {
    expect(neckProfile(0, 1.6, 1.4)).toBe(0);
    expect(neckProfile(1, 1.6, 1.4)).toBe(0);
  });

  test("is at its thickest where the rise and fall exponents meet, and one unit thick there", () => {
    // The peak is at rise / (rise + fall), not at the midpoint — that is what
    // the two exponents are for.
    const peak = 1.6 / (1.6 + 1.4);
    expect(neckProfile(peak, 1.6, 1.4)).toBeCloseTo(1, 5);
    expect(neckProfile(0.3, 1.6, 1.4)).toBeLessThan(1);
    expect(neckProfile(0.8, 1.6, 1.4)).toBeLessThan(1);
  });

  test("only exists while the droplet is falling", () => {
    const falling = buildNotificationGeometry({ drop: 0.4, expand: 0.1, layout });
    // At rest the neck is zero *wide*, which is what makes it invisible — the
    // rectangle keeps a height, exactly as in the original, and draws nothing.
    const landed = buildNotificationGeometry({ drop: 1, expand: 1, layout });
    expect(falling.neckWidth).toBeGreaterThan(0);
    expect(falling.neckHeight).toBeGreaterThan(0);
    expect(landed.neckWidth).toBe(0);
  });

  test("keeps the neck inside the droplet's own width", () => {
    for (let step = 1; step < 20; step++) {
      const geometry = buildNotificationGeometry({ drop: step / 20, expand: 0, layout });
      expect(geometry.neckWidth).toBeLessThanOrEqual(geometry.width + 1e-6);
    }
  });
});

describe("the content", () => {
  test("starts small and reaches full size", () => {
    expect(contentScale(0, 1)).toBeCloseTo(0.88, 5);
    expect(contentScale(1, 1)).toBeCloseTo(1, 5);
  });

  test("overshoots, and stops overshooting at a fifth", () => {
    expect(contentScale(1, 1.5)).toBeCloseTo(1.2, 5);
    expect(contentScale(1, 3)).toBeCloseTo(1.2, 5);
    expect(contentScale(1, 1.1)).toBeCloseTo(1.1, 5);
    expect(contentScale(0.5, 1.5)).toBeCloseTo(0.94 + 0.1, 5);
  });
});

describe("the small helpers", () => {
  test("clamp holds a value inside its bounds", () => {
    expect(clamp(-4, 0, 1)).toBe(0);
    expect(clamp(4, 0, 1)).toBe(1);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });

  test("mix interpolates both ways", () => {
    expect(mix(0, 10, 20)).toBe(10);
    expect(mix(1, 10, 20)).toBe(20);
    expect(mix(0.5, 10, 20)).toBe(15);
  });

  test("easeOutPower starts at nothing, ends at one, and slows on the way", () => {
    expect(easeOutPower(0, 1.25)).toBe(0);
    expect(easeOutPower(1, 1.25)).toBe(1);
    expect(easeOutPower(0.5, 1.25)).toBeGreaterThan(0.5);
  });
});
