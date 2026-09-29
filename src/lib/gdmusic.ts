import type { LyricLine, MusicSource, Quality, StreamUrl, Track } from "./types";
import { trackKey } from "./types";
import { needsAlias, resolveLatinQuery } from "./aliases";
import { dedupeTracks, queryVariants, rankTracks } from "./search";
import { similarity, stripDecorations } from "./text";
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

/**
 * Providers actually queried. The upstream API advertises ten, but probing it
 * shows only these two return usable data: one now answers "source is not
 * supported", and another serves adult content that has nothing to do with the
 * catalogue this app is for. The rest sit behind a request signature that the
 * endpoint rejects. Anything added here gets queried on every search, so a
 * dead provider costs latency for nothing.
 */
export const SOURCES: MusicSource[] = ["netease", "joox"];

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
  const pool = sources?.length ? sources : SOURCES;

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

/**
 * A curated provider playlist. This is the one endpoint that hands back real,
 * human-curated track lists instead of search noise, which is what the
 * "featured" rails need.
 */
export interface ProviderPlaylist {
  id: string;
  name: string;
  cover: string;
  tracks: Track[];
}

export async function getPlaylist(
  source: MusicSource,
  id: string,
): Promise<ProviderPlaylist | null> {
  if (!id) return null;
  try {
    const data = await api<{
      playlist?: {
        id: number | string;
        name?: string;
        coverImgUrl?: string;
        tracks?: {
          id: number | string;
          name?: string;
          dt?: number;
          ar?: { id: number | string; name?: string }[];
          al?: { id: number | string; name?: string; pic_str?: string; picUrl?: string };
        }[];
      };
    }>({ types: "playlist", source, id });

    const raw = data?.playlist;
    if (!raw || !Array.isArray(raw.tracks)) return null;

    const tracks: Track[] = raw.tracks.flatMap((t) => {
      if (!t?.id) return [];
      const ar = (t.ar ?? []).flatMap((a) => (a?.name ? [a.name] : []));
      return [
        {
          id: String(t.id),
          name: t.name ?? "",
          artist: ar,
          album: t.al?.name ?? "",
          pic_id: t.al?.pic_str ?? t.al?.picUrl ?? "",
          // Playlists carry the song id only; the url endpoint takes the same value.
          url_id: String(t.id),
          lyric_id: String(t.id),
          source,
        } satisfies Track,
      ];
    });

    if (!tracks.length) return null;
    return {
      id: String(raw.id ?? id),
      name: raw.name ?? "",
      cover: raw.coverImgUrl ?? tracks[0].pic_id,
      tracks,
    };
  } catch {
    return null;
  }
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

/**
 * The one cache key for one piece of artwork.
 *
 * Call sites used to build this by hand and three different shapes ended up in
 * the app — keyed by track id here, by pic id there — while all of them fetched
 * the same `getPicUrl(source, pic_id, size)`. React Query can only dedupe within
 * one key, so a track shown in a list and in the mini player resolved its cover
 * twice. Deriving the key from the exact arguments of the fetch makes that
 * impossible to get wrong again.
 *
 * The empty source/picId is the "no track loaded" case — the query is disabled
 * then, but the key still has to be stable or React Query would treat every
 * render as a new query.
 */
export function picKey(source: MusicSource | "", picId: string, size: number) {
  return ["pic", source, picId, String(size)] as const;
}

export interface Lyrics {
  lines: LyricLine[];
  /** Romanised form, when the provider has one (mostly Mandarin catalogue). */
  romanized: LyricLine[];
  /** Translated form — shown as a second line under each lyric. */
  translated: LyricLine[];
}

/**
 * Pair up the translated/romanised timings with the main lyric lines, so the
 * UI can render two lines per cue without re-parsing on every frame.
 */
function alignLines(base: LyricLine[], extra: LyricLine[]): LyricLine[] {
  if (!base.length || !extra.length) return base;
  const byTime = new Map<number, string>();
  for (const l of extra) byTime.set(Math.round(l.time * 10), l.text);
  return base.map((l) => ({
    ...l,
    ...(byTime.get(Math.round(l.time * 10)) ? { text2: byTime.get(Math.round(l.time * 10))! } : {}),
  }));
}

/**
 * The credit block every lyric sheet opens with — 作词/作曲, "Lyricist:", the
 * Persian equivalents. They are real lines with real timestamps, so without
 * this they render as the first two lines of the song.
 */
const CREDIT =
  /^\s*(作词|作曲|编曲|制作|填词|词|曲|混音|录音|监制|统筹)\s*[:：]|^[\s\w]*(lyricist|lyrics by|composer|music by|written by|words by|arranged by|produced by|Recording|Mixing|Mastering)\s*[:：]|^\s*(ترانه\s*سرا|آهنگساز|ترجمه|تنظیم|ARR|تریدر)\s*[:：]/i;

function isCredit(text: string): boolean {
  return CREDIT.test(text);
}

/** A sheet that is nothing but credits is not a lyric sheet. */
export function hasRealLyrics(lines: LyricLine[]): boolean {
  return lines.filter((l) => !isCredit(l.text)).length >= 3;
}

/**
 * Queries to try, widest first, when hunting for a lyric on another provider.
 *
 * Joox titles carry decorations NetEase does not use — "Baraye Azadi (feat.
 * Shervin Hajipour)", "Potk (Official Video)" — and searching for the decorated
 * form finds nothing even when the song is right there under its plain name.
 * So the bracketed noise is stripped and the bare title is tried on its own.
 */
export function lyricLookupQueries(track: { name: string; artist?: string[] }): string[] {
  const artist = track.artist?.[0]?.trim() ?? "";
  const bare = stripDecorations(track.name);
  const out = [track.name.trim(), `${artist} ${bare}`.trim(), bare].filter(Boolean);
  return [...new Set(out)];
}

/** Do the two credit lists have anyone in common? Compared pairwise because the
 *  providers order featured artists differently — Joox put "Káss" first on a
 *  Shervin Hajipour track, NetEase put Hajipour first. */
function artistsOverlap(a?: string[], b?: string[]): boolean {
  if (!a?.length || !b?.length) return false;
  return a.some((x) => b.some((y) => similarity(x, y) >= 0.8));
}

/**
 * Whether a candidate from another provider is really the same song.
 *
 * This guard is what stops the fallback from lying. Measured against live
 * results, NetEase's search is loose: asked for "Potk" it returns "Baraye",
 * which does have a full lyric sheet, and two different songs can share a
 * title across the two catalogues. Showing one song's words under another
 * song's name is worse than showing none, so a candidate has to clear both the
 * title and — when both sides credit an artist — the artist.
 */
export function isSameSong(
  wanted: { name: string; artist?: string[] },
  candidate: { name: string; artist?: string[] },
): boolean {
  const t = similarity(stripDecorations(wanted.name), stripDecorations(candidate.name));
  if (t < 0.5) return false;

  if (artistsOverlap(wanted.artist, candidate.artist)) return t >= 0.7;

  // No shared artist to corroborate: only an essentially identical title and a
  // near-identical credit list will do. Either side being anonymous is the one
  // case where the title has to speak for itself.
  const eitherUnknown = !wanted.artist?.length || !candidate.artist?.length;
  return t >= 0.97 && (eitherUnknown || artistsOverlap(wanted.artist, candidate.artist));
}

export async function getLyric(source: MusicSource, lyricId: string): Promise<Lyrics> {
  const empty: Lyrics = { lines: [], romanized: [], translated: [] };
  if (!lyricId) return empty;
  try {
    const data = await api<{ lyric?: string; tlyric?: string; romalrc?: string }>({
      types: "lyric",
      source,
      id: lyricId,
    });
    // Credit lines are dropped from what the UI shows but kept in the count, so
    // a sheet can still be recognised as "real" even when it is mostly credits.
    const base = parseLrc(data.lyric ?? "").filter((l) => !isCredit(l.text));
    const translated = parseLrc(data.tlyric ?? "").filter((l) => !isCredit(l.text));
    const romanized = parseLrc(data.romalrc ?? "").filter((l) => !isCredit(l.text));
    return {
      lines: alignLines(base, translated),
      romanized,
      translated,
    };
  } catch {
    return empty;
  }
}

export function parseLrc(raw: string): LyricLine[] {
  if (!raw) return [];
  const out: LyricLine[] = [];
  // Two timestamp shapes reach us. The common one is `[mm:ss.xx]`, but several
  // providers emit a range — `[00:00.00-1]` — for the credit lines that open a
  // lyric sheet. The old pattern required `]` straight after the fraction, so
  // every line of those sheets failed to match and the whole song came back
  // empty. The trailing `-<n>` is dropped and the start time is used.
  const re = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?(?:-\d+)?\]/g;
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
