// Module-level singleton <audio> so it persists across route/AppShell remounts.
let el: HTMLAudioElement | null = null;

export function getAudioEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    // Do NOT set crossOrigin — netease/kuwo/joox CDNs don't send CORS
    // headers, and forcing "anonymous" makes the media element refuse to load.
  }
  return el;
}

/**
 * Call synchronously inside a user gesture (click/tap) before triggering
 * async work. Primes the audio element so a subsequent programmatic play()
 * after an await is allowed.
 */
export function primeAudio() {
  const a = getAudioEl();
  if (!a) return;
  try {
    a.load();
    // Consume the user activation so a later async play() is allowed.
    // If src is empty this will reject silently; that's fine — the important
    // thing is that we called play() from within a real click/tap handler.
    const p = a.play();
    if (p && typeof p.then === "function") p.catch(() => {});
  } catch {
    /* noop */
  }
}
