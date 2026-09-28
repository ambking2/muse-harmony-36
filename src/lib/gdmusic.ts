import type { LyricLine, MusicSource, Quality, StreamUrl, Track } from "./types";
import { trackKey } from "./types";
import { needsAlias, resolveLatinQuery } from "./aliases";
import { dedupeTracks, queryVariants, rankTracks } from "./search";
import { filterJunk } from "./quality";

const BASE = "/api/gd/proxy"; // splat proxy — path segment is ignored

function qs(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  return s.toString();
}

/**
 * In-flight de-duplication. Three screens can request the same artwork at once
 * on first paint; without this, the app fires identical upstream requests.
 */
const inflight = new Map<string, Promise<unknown>>();

async function api<T>(params: Record<string, string | number | undefined>): Promise<T> {
  const key = `${BASE}?${qs(params)}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fetch(key)
    .then((res) => {
      if (!res.ok) throw new Error(`gdmusic ${res.status}`);
      return res.json() as Promise<T>;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export const SOURCES: { id: MusicSource; label: string }[] = [
  { id: "netease", label: "NetEase" },
  { id: "kuwo", label: "Kuwo" },
  { id: "joox", label: "JOOX" },
];

export const QUALITIES: { br: Quality; label: string }[] = [
  { br: 128, label: "128 kbps" },
  { br: 320, label: "320 kbps" },
  { br: 999, label: "FLAC" },
];

export async function searchTracks(
  name: string,
  { source = "netease" as MusicSource, count = 30, page = 1 } = {},
): Promise<Track[]> {
  if (!name.trim()) return [];
  const data = await api<Track[] | { error: string }>({
    types: "search",
    source,
    name,
    count,
    pages: page,
  });
  if (!Array.isArray(data)) return [];
  return data;
}

/** One provider, one query string, failures swallowed. */
function searchOne(
  name: string,
  source: MusicSource,
  count: number,
  page: number,
): Promise<Track[]> {
  return searchTracks(name, { source, count, page }).catch(() => [] as Track[]);
}

/** Interleave N result lists so the first page mixes providers fairly. */
function interleave(lists: Track[][]): Track[] {
  const out: Track[] = [];
  const max = Math.max(0, ...lists.map((r) => r.length));
  for (let i = 0; i < max; i++) for (const r of lists) if (r[i]) out.push(r[i]);
  return out;
}

/**
 * Search every provider in parallel and merge into one ranked list.
 * Results are scored against the query, Iranian/Persian-language releases are
 * boosted, and near-duplicate rows are collapsed.
 */
export async function searchTracksAll(
  name: string,
  {
    count = 20,
    page = 1,
    iranianFirst = true,
  }: { count?: number; page?: number; iranianFirst?: boolean } = {},
): Promise<Track[]> {
  if (!name.trim()) return [];
  const per = Math.max(8, Math.ceil((count * 1.5) / SOURCES.length) + 2);
  const results = await Promise.all(SOURCES.map((s) => searchOne(name, s.id, per, page)));
  const merged = filterJunk(interleave(results));
  return rankTracks(merged, name, {
    keepUnmatched: true,
    iranianBoost: iranianFirst ? 2.5 : 0,
  });
}

/**
 * The main search entry point.
 *
 * A Persian query is translated to the Latin form the providers actually index
 * (see src/lib/aliases.ts) and both spellings are queried, then merged and
 * ranked. `keepUnmatched` is on so a thin provider result still renders
 * something instead of an empty screen.
 */
export async function searchSmart(
  raw: string,
  {
    count = 20,
    page = 1,
    iranianFirst = true,
    sources,
  }: {
    count?: number;
    page?: number;
    iranianFirst?: boolean;
    sources?: MusicSource[];
  } = {},
): Promise<Track[]> {
  const query = raw.trim();
  if (!query) return [];
  const pool = sources?.length ? sources : SOURCES.map((s) => s.id);

  const run = async (term: string): Promise<Track[]> =>
    (await Promise.all(pool.map((id) => searchOne(term, id, Math.max(10, count), page)))).flat();

  // For Persian input the curated alias is the term most likely to return real
  // Iranian catalogue; the raw Persian string is queried too as a fallback.
  const alias = needsAlias(query) ? resolveLatinQuery(query) : null;
  const terms = alias ? [alias, query] : [query];

  const batches = await Promise.all(terms.map(run));

  // Provenance matters: rows found via the curated alias come from a query the
  // providers actually understand, so they are trusted over rows that merely
  // contain the Persian term inside an SEO-stuffed title.
  const weighted: { t: Track; w: number }[] = [];
  const weights = new Map<string, number>();
  batches.forEach((rows, i) => {
    const w = !alias ? 1 : i === 0 ? 1.6 : 0.45;
    for (const t of rows) {
      weighted.push({ t, w });
      // A row can appear in both batches. Keep the strongest provenance rather
      // than letting whichever batch came last overwrite it.
      const k = trackKey(t);
      weights.set(k, Math.max(weights.get(k) ?? 0, w));
    }
  });

  return rankTracks(filterJunk(weighted.map((x) => x.t)), query, {
    keepUnmatched: true,
    iranianBoost: iranianFirst ? 2.5 : 0,
    weights,
  });
}

/** A single provider, still ranked and de-duplicated. */
export async function searchTracksIn(
  name: string,
  source: MusicSource,
  {
    count = 30,
    page = 1,
    iranianFirst = true,
  }: {
    count?: number;
    page?: number;
    iranianFirst?: boolean;
  } = {},
): Promise<Track[]> {
  if (!name.trim()) return [];
  const alias = needsAlias(name) ? resolveLatinQuery(name) : null;
  const terms = alias ? [alias, name] : [name];
  const batches = await Promise.all(terms.map((t) => searchOne(t, source, count, page)));
  return rankTracks(filterJunk(batches.flat()), name, {
    keepUnmatched: true,
    iranianBoost: iranianFirst ? 2.5 : 0,
  });
}

/** Artists and albums present in a result set, for the "jump to" rails. */
export function extractEntities(tracks: Track[]) {
  const artists: string[] = [];
  const albums: string[] = [];
  const seenArtist = new Set<string>();
  const seenAlbum = new Set<string>();
  for (const t of tracks) {
    for (const a of t.artist ?? []) {
      if (a && !seenArtist.has(a)) {
        seenArtist.add(a);
        artists.push(a);
      }
    }
    if (t.album && !seenAlbum.has(t.album)) {
      seenAlbum.add(t.album);
      albums.push(t.album);
    }
  }
  return { artists, albums };
}

export async function getStreamUrl(
  source: MusicSource,
  id: string,
  br: Quality = 320,
): Promise<StreamUrl> {
  const data = await api<StreamUrl & { error?: string }>({
    types: "url",
    source,
    id,
    br,
  });
  if (!data?.url) {
    // Fall back through the quality ladder: FLAC is the least available.
    for (const fallback of [320, 128] as Quality[]) {
      if (fallback === br) continue;
      try {
        const alt = await api<StreamUrl>({ types: "url", source, id, br: fallback });
        if (alt?.url) return { url: alt.url, br: fallback, size: alt.size ?? 0 };
      } catch {
        // Try the next rung.
      }
    }
    return { url: "", br, size: 0 };
  }
  return { url: data.url, br: data.br ?? br, size: data.size ?? 0 };
}

export async function getPicUrl(source: MusicSource, picId: string, size = 500): Promise<string> {
  if (!picId) return "";
  try {
    const data = await api<{ url?: string }>({ types: "pic", source, id: picId, size });
    return data.url || "";
  } catch {
    return "";
  }
}

export async function getLyric(
  source: MusicSource,
  lyricId: string,
): Promise<{ raw: string; lines: LyricLine[]; tRaw?: string }> {
  if (!lyricId) return { raw: "", lines: [] };
  try {
    const data = await api<{ lyric?: string; tlyric?: string }>({
      types: "lyric",
      source,
      id: lyricId,
    });
    return { raw: data.lyric ?? "", lines: parseLrc(data.lyric ?? ""), tRaw: data.tlyric };
  } catch {
    return { raw: "", lines: [] };
  }
}

export function parseLrc(raw: string): LyricLine[] {
  if (!raw) return [];
  const out: LyricLine[] = [];
  const re = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  for (const line of raw.split(/\r?\n/)) {
    let m: RegExpExecArray | null;
    const times: number[] = [];
    let lastEnd = 0;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      const mm = Number(m[1]);
      const ss = Number(m[2]);
      const ms = m[3] ? Number(m[3].padEnd(3, "0")) : 0;
      times.push(mm * 60 + ss + ms / 1000);
      lastEnd = m.index + m[0].length;
    }
    const text = line.slice(lastEnd).trim();
    if (!times.length) continue;
    if (!text) continue;
    for (const t of times) out.push({ time: t, text });
  }
  return out.sort((a, b) => a.time - b.time);
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export { dedupeTracks, queryVariants };
