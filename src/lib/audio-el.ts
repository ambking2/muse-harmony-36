// Module-level singleton <audio> so it persists across route/AppShell remounts.
let el: HTMLAudioElement | null = null;

// A 1-second silent MP3 (base64). Playing this inside a user gesture "unlocks"
// the audio element so that a later async src assignment can start playback
// without hitting the browser's autoplay policy.
const SILENT =
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA//////////////////////////////////////////////////////////////////8AAAA5TEFNRTMuMTAwAc0AAAAAAAAAABSAJAJAQgAAgAAAAnGMHkkIAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVU=";

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
    if (!a.src) a.src = SILENT;
    const p = a.play();
    if (p && typeof p.then === "function") p.catch(() => {});
  } catch {
    /* noop */
  }
}
