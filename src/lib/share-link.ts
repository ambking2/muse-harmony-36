import type { MusicSource, Track } from "./types";

/**
 * A shareable link has to work for someone who has never opened the app, so it
 * cannot point at a search — the receiving device has to be able to play the
 * track straight from the URL. The track's identity therefore travels inside
 * the link.
 *
 * It is encoded as a positional, pipe-delimited string rather than JSON. A JSON
 * key alone is more bytes than the whole separator budget, the provider name is
 * one letter instead of seven, and two fields are dropped outright because they
 * are recoverable:
 *
 *   lyric_id is always the track id
 *   url_id  is the track id for every track the app has seen
 *
 * On a real Iranian track that takes the key from 222 characters to 127 — short
 * enough to survive being pasted through a messenger.
 */

/** Fields are separated by a pipe; artists are joined by a unit separator,
 *  which cannot occur in a title. */
const SEP = "|";
const ARTIST_SEP = "\u001f";
/** Bumped if the layout ever changes; lets the reader tell the formats apart. */
const VERSION = "1";

/**
 * A short checksum, appended after a tilde.
 *
 * Without it a link cut short in a messenger still decodes: the fields are
 * positional, so losing the tail just truncates the album and leaves something
 * that looks like a valid record. The checksum makes a damaged link fail
 * loudly instead of opening a half-built track.
 */
function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(6, "0").slice(-6);
}

const SOURCE_CODE: Record<string, MusicSource> = {
  n: "netease",
  j: "joox",
};

function encodeSource(s: MusicSource): string {
  return s === "netease" ? "n" : s === "joox" ? "j" : s;
}

function decodeSource(s: string): MusicSource {
  return SOURCE_CODE[s] ?? (s as MusicSource);
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(s.length / 4) * 4, "=");
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/** `/t/<key>` — the only thing a shared track needs to play itself. */
export function trackShareKey(t: Track): string {
  const parts = [
    VERSION,
    encodeSource(t.source),
    t.id,
    // Leave the slot empty rather than repeat the id when they are the same.
    t.url_id && t.url_id !== t.id ? t.url_id : "",
    t.pic_id ?? "",
    t.name ?? "",
    (t.artist ?? []).join(ARTIST_SEP),
    t.album ?? "",
  ];
  return toBase64Url(
    new TextEncoder().encode(`${parts.join(SEP)}${SEP}${checksum(parts.join(SEP))}`),
  );
}

export function trackShareUrl(t: Track): string {
  const { origin } = window.location;
  return `${origin}/t/${trackShareKey(t)}`;
}

/** The pre-compaction shape, so links shared before this change still open. */
interface LegacySharedTrack {
  n?: string;
  a?: string[];
  b?: string;
  s?: MusicSource;
  i?: string;
  p?: string;
  u?: string;
  l?: string;
}

function fromCompact(text: string): Track | null {
  const cut = text.lastIndexOf(SEP);
  if (cut < 0) return null;
  const body = text.slice(0, cut);
  if (checksum(body) !== text.slice(cut + 1)) return null;

  const [version, source, id, urlId, picId, name, artists, album] = body.split(SEP);
  if (version !== VERSION || !id) return null;
  return {
    id,
    // Both defaults matter: a track shared from the queue has to still play.
    url_id: urlId || id,
    lyric_id: id,
    source: decodeSource(source ?? ""),
    name: name ?? "",
    artist: artists ? artists.split(ARTIST_SEP) : [],
    album: album ?? "",
    pic_id: picId ?? "",
  };
}

function fromLegacy(text: string): Track | null {
  const p = JSON.parse(text) as LegacySharedTrack;
  if (!p || typeof p !== "object" || typeof p.i !== "string" || !p.i) return null;
  if (typeof p.s !== "string") return null;
  return {
    id: p.i,
    name: typeof p.n === "string" ? p.n : "",
    artist: Array.isArray(p.a) ? p.a.filter((x): x is string => typeof x === "string") : [],
    album: typeof p.b === "string" ? p.b : "",
    pic_id: typeof p.p === "string" ? p.p : "",
    url_id: typeof p.u === "string" ? p.u : p.i,
    lyric_id: typeof p.l === "string" ? p.l : p.i,
    source: p.s as MusicSource,
  };
}

/** Returns null for a truncated, hand-edited or otherwise malformed key. */
export function decodeTrackShareKey(key: string): Track | null {
  try {
    const text = new TextDecoder().decode(fromBase64Url(key));
    if (text.startsWith("{")) return fromLegacy(text);
    return fromCompact(text);
  } catch {
    return null;
  }
}

/**
 * Put the deep link on the clipboard.
 *
 * Deliberately does not offer `navigator.share`. On a phone that opens the OS
 * share sheet, which is a different action from the one the button promises —
 * and the toast then claimed the link had been copied when nothing had been.
 * Copying is what the button says, so copying is what it does.
 *
 * The clipboard API needs a secure context and can be refused outright, so the
 * old `execCommand` path stays as a fallback rather than a nicety.
 */
export async function shareTrack(t: Track): Promise<boolean> {
  const url = trackShareUrl(t);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Firefox before permission is granted, and any non-secure context, reject
    // the async API. A hidden textarea with the text selected still works.
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
