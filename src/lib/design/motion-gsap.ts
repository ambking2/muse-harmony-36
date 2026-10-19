import { gsap } from "gsap";

/**
 * The celebration language.
 *
 * The interface springs in `motion.ts` answer the finger. This module is the
 * other half of the vocabulary, ported from the Rapport dashboard
 * (reverse-engineered; see `rapport-copy/ANALYSIS.md`): the entrances and
 * rewards that GSAP does better than a spring — masked headline rises, staggered
 * card arrivals, numbers that count up, a stat that flashes when it changes,
 * a badge that floats off an action, buttons that lean toward the pointer.
 *
 * Every number here is the extracted original, not a re-tune: 0.85s headline,
 * 0.9s card rise, `power4.out` for arrivals, `back.out(3)` for pops. The two
 * systems never animate the same property of the same element — springs own
 * scale/selection, this module owns position entrances and text.
 *
 * All durations funnel through `dur()`, which zeroes them under Reduce Motion
 * so tweens jump to their end state, the same contract the CSS uses.
 */

export { gsap };

/* ------------------------------------------------------------------ gates */

let cached: { reduce: MediaQueryList; fine: MediaQueryList } | null = null;

function queries() {
  if (!cached) {
    cached = {
      reduce: window.matchMedia("(prefers-reduced-motion: reduce)"),
      fine: window.matchMedia("(hover: hover) and (pointer: fine)"),
    };
  }
  return cached;
}

/** True when the user asked for reduced motion. */
export const reduced = () => typeof window !== "undefined" && queries().reduce.matches;

/** True on a desktop-class pointer — hover effects are wasted on touch. */
export const finePointer = () => typeof window !== "undefined" && queries().fine.matches;

/**
 * Rapport's `J()`: every duration passes through it, so Reduce Motion zeroes
 * the timeline instead of branching at every call site.
 */
export const dur = (seconds: number) => (reduced() ? 0 : seconds);

/**
 * Hover motion waits for the entrance to finish — Rapport arms its lift one
 * and a half seconds after boot so a pointer resting on the page never fights
 * the arrival. Returns a cleanup, so an effect can own it.
 */
let armed = false;
export const motionArmed = () => armed;
export function armMotion(delayMs = 1600): () => void {
  if (reduced()) {
    armed = true;
    return () => {};
  }
  const timer = window.setTimeout(() => {
    armed = true;
  }, delayMs);
  return () => window.clearTimeout(timer);
}

/* --------------------------------------------------------------- arrivals */

/**
 * Split a heading into word spans for the masked rise.
 *
 * Rapport splits to characters, but Persian is cursive — a letter carries part
 * of its neighbour, so splitting per character destroys the joining. Words
 * never join across a space, so the word is the smallest safe unit. The
 * original text moves to `aria-label` and the spans are hidden from the
 * accessibility tree, like Rapport does.
 */
export function splitWords(el: HTMLElement): HTMLElement[] {
  const text = (el.dataset.text ?? el.textContent ?? "").trim();
  if (!text) return [];
  if (el.dataset.split === text) {
    return [...el.querySelectorAll<HTMLElement>(".word-in")];
  }
  el.setAttribute("aria-label", text);
  el.textContent = "";
  text.split(/\s+/).forEach((word, index, all) => {
    const mask = document.createElement("span");
    mask.className = "word";
    mask.setAttribute("aria-hidden", "true");
    const inner = document.createElement("span");
    inner.className = "word-in";
    inner.textContent = word;
    mask.append(inner);
    el.append(mask);
    if (index < all.length - 1) el.append(document.createTextNode(" "));
  });
  el.dataset.split = text;
  return [...el.querySelectorAll<HTMLElement>(".word-in")];
}

/**
 * Rapport's `no()`: the headline entrance. Words rise out of their own mask
 * with a slight rotation, one after another — the app's most recognizable
 * signature (0.85s, power4.out, 0.022s per character there, per word here).
 */
export function wordRise(el: HTMLElement, delay = 0): gsap.core.Tween | null {
  const words = splitWords(el);
  if (!words.length) return null;
  return gsap.fromTo(
    words,
    { yPercent: 115, rotation: 6 },
    {
      yPercent: 0,
      rotation: 0,
      duration: dur(0.85),
      ease: "power4.out",
      stagger: dur(0.045),
      delay: dur(delay),
      clearProps: "transform",
    },
  );
}

function list(targets: Element | Element[] | null): Element[] {
  if (!targets) return [];
  return Array.isArray(targets) ? targets : [targets];
}

/**
 * Rapport's `ro()`: a group arriving. Cards rise 34px, slightly small, and
 * settle one after another — 0.9s, power3.out, 0.07s of stagger.
 */
export function rise(
  targets: Element | Element[] | null,
  { y = 34, stagger = 0.07, delay = 0 }: { y?: number; stagger?: number; delay?: number } = {},
): gsap.core.Tween | null {
  const els = list(targets);
  if (!els.length) return null;
  return gsap.fromTo(
    els,
    { opacity: 0, y, scale: 0.985 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: dur(0.9),
      ease: "power3.out",
      stagger: dur(stagger),
      delay: dur(delay),
      clearProps: "transform,opacity",
    },
  );
}

/**
 * Rapport's `io()`: the quick fade-slide for rows and small items — 0.55s,
 * power3.out, a tighter 0.045s stagger.
 */
export function fadeSlide(
  targets: Element | Element[] | null,
  {
    x = 0,
    y = 12,
    stagger = 0.045,
    delay = 0,
  }: { x?: number; y?: number; stagger?: number; delay?: number } = {},
): gsap.core.Tween | null {
  const els = list(targets);
  if (!els.length) return null;
  return gsap.fromTo(
    els,
    { opacity: 0, x, y },
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration: dur(0.55),
      ease: "power3.out",
      stagger: dur(stagger),
      delay: dur(delay),
      clearProps: "transform,opacity",
    },
  );
}

/**
 * Rapport's `ao()`: the pop-in for tiles and chips — up from 40px, tilted
 * alternately ±3°, overshooting on back.out(1.4).
 */
export function popIn(
  targets: Element | Element[] | null,
  { delay = 0, stagger = 0.06 }: { delay?: number; stagger?: number } = {},
): gsap.core.Tween | null {
  const els = list(targets);
  if (!els.length || reduced()) return null;
  return gsap.fromTo(
    els,
    { opacity: 0, y: 40, rotation: (i: number) => (i % 2 ? 3 : -3), scale: 0.94 },
    {
      opacity: 1,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: dur(0.8),
      ease: "back.out(1.4)",
      stagger: dur(stagger),
      delay: dur(delay),
      clearProps: "transform,opacity",
    },
  );
}

/**
 * Rapport's `oo()`: a single element popping to attention — an avatar, a
 * heart, a chip. From 60% size and invisible, landing on back.out(3).
 */
export function scalePop(
  target: Element | null,
  { from = 0.6, delay = 0 }: { from?: number; delay?: number } = {},
): void {
  if (!target || reduced()) return;
  gsap.fromTo(
    target,
    { scale: from, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: 0.6,
      ease: "back.out(3)",
      delay,
      overwrite: "auto",
      clearProps: "transform,opacity",
    },
  );
}

/** Rapport's `fo()`: an icon snapping in — 72% to full on back.out(3). */
export function iconPop(target: Element | null): void {
  if (!target || reduced()) return;
  const svg = target.querySelector("svg") ?? target;
  gsap.fromTo(
    svg,
    { scale: 0.72 },
    { scale: 1, duration: 0.55, ease: "back.out(3)", overwrite: true },
  );
}

/* ---------------------------------------------------------------- rewards */

/**
 * Rapport's `so()`: a number that just changed flashes the tint and dips
 * forward. The class does the colour (CSS keyframes), the tween does the dip.
 */
export function statFlash(el: HTMLElement | null): void {
  if (!el) return;
  el.classList.remove("is-flash");
  void el.offsetWidth; // restart the CSS animation
  el.classList.add("is-flash");
  if (reduced()) return;
  gsap.fromTo(
    el,
    { y: -4, scale: 1.06 },
    {
      y: 0,
      scale: 1,
      duration: 0.55,
      ease: "back.out(2.4)",
      overwrite: "auto",
      clearProps: "transform",
    },
  );
}

/**
 * Rapport's `co()`: a badge that floats up off the action and dissolves —
 * the "+$400" of the original, here the «به علاقه‌مندی‌ها اضافه شد» of the player.
 */
export function floatUp(anchor: Element | DOMRect, text: string): void {
  if (reduced()) return;
  const rect = anchor instanceof Element ? anchor.getBoundingClientRect() : anchor;
  const badge = Object.assign(document.createElement("span"), {
    className: "float-up",
    textContent: text,
  });
  badge.setAttribute("aria-hidden", "true");
  badge.style.left = `${rect.left + rect.width / 2}px`;
  badge.style.top = `${rect.top}px`;
  document.body.append(badge);
  gsap.fromTo(
    badge,
    { opacity: 0, y: 6, xPercent: -50, scale: 0.9 },
    {
      keyframes: [
        { opacity: 1, y: -12, scale: 1, duration: 0.35, ease: "back.out(2)" },
        { opacity: 0, y: -40, duration: 0.8, ease: "power2.in", delay: 0.6 },
      ],
      onComplete: () => badge.remove(),
    },
  );
}

/* -------------------------------------------------------------- numbers */

const counters = new WeakMap<HTMLElement, { v: number }>();

/**
 * Rapport's `uo()`: a number that counts to its value. State lives in a
 * WeakMap so a re-render continues from wherever the last tween stopped
 * instead of restarting from zero.
 */
export function countUp(
  el: HTMLElement | null,
  to: number,
  format: (value: number) => string = (value) => value.toLocaleString("fa-IR"),
  { duration = 1.2, delay = 0, from }: { duration?: number; delay?: number; from?: number } = {},
): void {
  if (!el) return;
  let state = counters.get(el);
  if (!state) counters.set(el, (state = { v: from ?? 0 }));
  if (from !== undefined) state.v = from;
  gsap.killTweensOf(state);
  if (reduced() || !duration || state.v === to) {
    state.v = to;
    el.textContent = format(to);
    return;
  }
  const target = state;
  el.textContent = format(state.v);
  gsap.to(target, {
    v: to,
    duration,
    delay,
    ease: "power3.out",
    onUpdate: () => {
      el.textContent = format(target.v);
    },
    onComplete: () => {
      el.textContent = format(to);
    },
  });
}

/* ---------------------------------------------------------------- pointer */

/**
 * Rapport's `po()`: the magnetic button. It leans toward the pointer — a
 * quarter of the horizontal offset, 30% of the vertical — and springs back on
 * the way out, via quickTo so the follow is a single persistent tween.
 */
export function bindMagnetic(
  el: HTMLElement,
  { strengthX = 0.24, strengthY = 0.3 }: { strengthX?: number; strengthY?: number } = {},
): () => void {
  if (reduced() || !finePointer()) return () => {};
  const toX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
  const toY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
  const signals = new AbortController();
  el.addEventListener(
    "pointermove",
    (event) => {
      const rect = el.getBoundingClientRect();
      toX((event.clientX - rect.left - rect.width / 2) * strengthX);
      toY((event.clientY - rect.top - rect.height / 2) * strengthY);
    },
    { signal: signals.signal },
  );
  el.addEventListener(
    "pointerleave",
    () => {
      toX(0);
      toY(0);
    },
    { signal: signals.signal },
  );
  return () => signals.abort();
}

/**
 * Rapport's `ho()`: the data-lift hover — an element rises 4px under the
 * pointer and settles back, but only once the entrance has armed itself and
 * only for desktop pointers.
 */
export function bindLift(el: HTMLElement, distance = -4): () => void {
  if (!finePointer()) return () => {};
  const signals = new AbortController();
  el.addEventListener(
    "pointerenter",
    () => {
      if (!reduced() && motionArmed()) {
        gsap.to(el, { y: distance, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      }
    },
    { signal: signals.signal },
  );
  el.addEventListener(
    "pointerleave",
    () => {
      if (motionArmed()) {
        gsap.to(el, {
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto",
          clearProps: "transform",
        });
      }
    },
    { signal: signals.signal },
  );
  return () => signals.abort();
}
