import { useSyncExternalStore } from "react";

/**
 * Glass mode.
 *
 * The whole interface is built from separate translucent panels floating over a
 * blurred, artwork-tinted background — the Liquid Glass look. That look costs
 * a `backdrop-filter` per panel, which is the single most expensive thing this
 * UI does on a low-powered phone.
 *
 * So the effect is a mode, not a constant: turning it off swaps the translucent
 * surfaces for solid ones and drops every blur, which keeps the same layout
 * and the same contrast rules. The preference is remembered on the device and
 * read by the CSS through `data-glass` on the root element — no component has
 * to know it exists.
 *
 * A plain module-level store rather than context: the value has to be readable
 * before React renders anything (it drives a root attribute), and exactly one
 * place writes it.
 */

export type GlassMode = "on" | "off";

const STORAGE_KEY = "muis-glass";
const DEFAULT: GlassMode = "on";

function read(): GlassMode {
  if (typeof document === "undefined") return DEFAULT;
  // The attribute is the source of truth at runtime; localStorage only
  // restores it across reloads.
  const stored = document.documentElement.dataset.glass;
  return stored === "off" || stored === "on" ? stored : DEFAULT;
}

let current: GlassMode = read();
const listeners = new Set<() => void>();

function commit(mode: GlassMode) {
  current = mode;
  document.documentElement.dataset.glass = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode, or storage disabled — the choice just does not persist.
  }
  listeners.forEach((listener) => listener());
}

/** Restores the saved choice. Called once, at the root, before first paint of
 *  a hydrated app; the inline script-free fallback is the default value, which
 *  is why the server snapshot matches it. */
export function initGlassMode(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  commit(stored === "off" ? "off" : DEFAULT);
}

export function setGlassMode(mode: GlassMode): void {
  if (mode === current) return;
  commit(mode);
}

export function glassMode(): GlassMode {
  return current;
}

/** `useSyncExternalStore` so every subscriber re-renders on the same commit. */
export function useGlassMode(): GlassMode {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    glassMode,
    // Server render: always the default, so hydration matches.
    () => DEFAULT,
  );
}
