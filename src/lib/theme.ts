import { useSyncExternalStore } from "react";

/**
 * Appearance.
 *
 * Two appearances, both first-class: the light one is the default and the one
 * the app opens in, because that is what most people expect from a music app
 * they open in daylight. Dark is the same interface with the palette Apple's
 * uses after sunset — the tokens are the same names either way, so no
 * component ever asks which mode it is in.
 *
 * The choice is a class on the root element, which means three things fall out
 * for free: the Tailwind `dark:` variants work, the CSS custom properties swap
 * before React renders anything, and the browser's own repaint is the only
 * work. It is applied by a small inline script in `head` so the first paint is
 * already correct — an effect would paint one frame of the wrong appearance on
 * every load, which is exactly the flash you notice on a light app.
 *
 * A plain module store rather than context, for the same reason the glass mode
 * is one: the value has to be readable before React renders anything, and
 * exactly one place writes it.
 */

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "muis-theme";
const DEFAULT: ThemeMode = "light";

function read(): ThemeMode {
  if (typeof document === "undefined") return DEFAULT;
  // The class is the source of truth at runtime; localStorage only restores it
  // across reloads.
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

let current: ThemeMode = read();
const listeners = new Set<() => void>();

function commit(mode: ThemeMode) {
  current = mode;
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode, or storage disabled — the choice just does not persist.
  }
  listeners.forEach((listener) => listener());
}

/** Restores the saved choice. Called once at the root, after hydration. */
export function initTheme(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  commit(stored === "dark" ? "dark" : "light");
}

export function setTheme(mode: ThemeMode): void {
  if (mode === current) return;
  commit(mode);
}

export function themeMode(): ThemeMode {
  return current;
}

/** `useSyncExternalStore` so every subscriber re-renders on the same commit. */
export function useTheme(): ThemeMode {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    themeMode,
    // Server render: always the default, so hydration matches.
    () => DEFAULT,
  );
}
