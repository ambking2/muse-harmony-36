import { useEffect, useState } from "react";
import { getPicUrl } from "@/lib/gdmusic";
import { usePlayer } from "@/stores/player";

/**
 * Derives a dominant colour from the current track's artwork and publishes it
 * as `--track-accent` so the UI can tint itself per-song (ambient glow,
 * now-playing gradient, progress bars). The artwork URL itself is published as
 * `--track-art`, which is what the blurred background layer behind the glass
 * panels is made of. Falls back to the theme indigo whenever the artwork is
 * missing, CORS-blocked, or fails to decode.
 */

const FALLBACK = "oklch(0.55 0.17 280)";

const cache = new Map<string, string>();

function rgbToOklch(r: number, g: number, b: number): string {
  // sRGB → linear
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.sqrt(A * A + B * B);
  const H = C < 1e-6 ? 0 : (Math.atan2(B, A) * 180) / Math.PI;

  // Keep the tint vivid but never fully saturated or fully black, so text on
  // top of the glow always keeps its contrast.
  const lightness = Math.min(0.82, Math.max(0.55, L * 0.9 + 0.28));
  const chroma = Math.min(0.16, Math.max(0.05, C));

  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${H.toFixed(1)})`;
}

/** Average the most colourful pixels of the image. */
async function dominantColor(url: string): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const cached = cache.get(url);
  if (cached) return cached;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";
  img.src = url;

  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  if (!loaded) return null;

  try {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 128) continue;
      const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      // Skip near-grey pixels — they carry no hue information.
      if (max - min < 12) continue;
      r += pr;
      g += pg;
      b += pb;
      n++;
    }
    if (n < 4) return null;
    const color = rgbToOklch(r / n, g / n, b / n);
    cache.set(url, color);
    return color;
  } catch {
    // Tainted canvas (no CORS headers upstream) — fall back gracefully.
    return null;
  }
}

/** Mount once inside the audio engine / app shell. */
export function useArtworkAccent() {
  const track = usePlayer((s) => s.queue[s.index]);
  const setAccent = usePlayer((s) => s.setAccent);
  const accent = usePlayer((s) => s.accent);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!track) {
      setUrl(null);
      return;
    }
    if (track.picUrl) {
      setUrl(track.picUrl);
      return;
    }
    getPicUrl(track.source, track.pic_id, 300)
      .then((u) => {
        if (!cancelled) setUrl(u || null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [track?.source, track?.id, track?.picUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;
    if (!url) {
      root.style.setProperty("--track-accent", FALLBACK);
      root.style.setProperty("--track-art", "none");
      setAccent(null);
      return;
    }
    dominantColor(url).then((color) => {
      if (cancelled) return;
      const value = color ?? FALLBACK;
      root.style.setProperty("--track-accent", value);
      // Quoted url() so a path with spaces or parentheses in it cannot break
      // the declaration.
      root.style.setProperty("--track-art", `url("${url}")`);
      setAccent(color);
    });
    return () => {
      cancelled = true;
    };
  }, [url, setAccent]);

  return { accent, url };
}
