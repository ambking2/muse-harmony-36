import type { Track } from "./types";
import { trackKey } from "./types";
import { latinAliasFor, needsAlias, resolveLatinQuery } from "./aliases";
import { sourceTrust } from "./quality";
import {
  hasPersianScript,
  normalizeEn,
  normalizeFa,
  similarity,
  skeleton,
  stripDecorations,
  titleTokens,
  transliterateFa,
} from "./text";

/**
 * Well-known Iranian / Persian-language artists. Used purely as a ranking
 * signal so that, for a Persian query, Iranian catalogue entries float to the
 * top of a merged result list. It is not an allow-list — nothing is hidden.
 */
const IRANIAN_ARTISTS = new Set(
  [
    // پاپ / معاصر
    "محسن یگانه",
    "بنیامین بهزاد",
    "پرواز همای",
    "ستار",
    "رضا شیرازی",
    "معین",
    "همایون شجری پور",
    "حمیرا",
    "سوسن",
    "شهرام شب پره",
    "گوگوش",
    "داریوش",
    "علیرضا طلیسچی",
    "مرتضی پاشایی",
    "رضا بهرام",
    "حسین علیزاده",
    "مهدی یراحمی",
    "محسن چاوشی",
    "محمدرضا شجری پور",
    "شهاب اکبری",
    "علیرضا شاه محمدی",
    "رضا صادقی",
    "ایمان کردونی",
    "سیاوش قمیشی",
    "ابی",
    "محمدرضا چهارسو",
    "پرواز چماوشی",
    // رپ و آندرگراند
    "امیر تتلو",
    "هیچکس",
    "یاس",
    "پیشرو",
    "قاف",
    "سورنا",
    "پرانک",
    "امیر آرمان",
    "بهزاد لیتو",
    "آرش و رهنا",
    "کوروش یغمایی",
    // بین‌المللی ایرانی
    "داریوش اقبالی",
    "مهدی میرزایی",
    "شهره",
    "نسرین",
    "ستار",
    // مینیمال و الکترونیک
    "کیهان کلهر",
    "آرمان یاسایی",
    "وحید تاج دل",
    "محمدرضا چلیپا",
  ].map((n) => normalizeFa(n)),
);

const IRANIAN_ALBUM_HINTS = ["سال‌های گذشته", "ایران", "نسل طلایی", "موسیقی ایرانی"];

/** Heuristic: is this row an Iranian/Persian-language release? */
export function isIranianTrack(t: Track): boolean {
  const name = normalizeFa(t.name);
  const artists = t.artist.map(normalizeFa);
  if (artists.some((a) => IRANIAN_ARTISTS.has(a))) return true;
  // Long-running artist names may be split across the artist array; check
  // the joined form too so "محسن یگانه" matches ["محسن", "یگانه"].
  if (IRANIAN_ARTISTS.has(artists.join(" "))) return true;
  if (IRANIAN_ALBUM_HINTS.some((h) => t.album?.toLowerCase().includes(h))) return true;
  // Persian script in the title plus a Persian-script artist is a strong hint.
  return hasPersianScript(name) && artists.some(hasPersianScript);
}

/** Does any field of the track contain the normalized query as a token run? */
function fieldMatch(haystack: string, needle: string): number {
  if (!needle) return 0;
  if (haystack === needle) return 1;
  if (haystack.startsWith(needle + " ")) return 0.9;
  const idx = haystack.indexOf(needle);
  if (idx < 0) return 0;
  // Word-boundary hit scores higher than a hit inside a longer word.
  return idx === 0 || haystack[idx - 1] === " " ? 0.75 : 0.35;
}

/**
 * Relevance score for one track against a user query. Higher is better.
 * Range is roughly 0..10 before the Iranian boost.
 */
export function scoreTrack(t: Track, rawQuery: string): number {
  const q = normalizeFa(rawQuery);
  if (!q) return 0;
  const qEn = normalizeEn(rawQuery);
  const qTranslit = transliterateFa(rawQuery);
  // Iranian music is indexed under Latin names, so a Persian query has to be
  // matched against romanised fields too — via vowel-free skeletons, which is
  // the only comparison that survives the missing short vowels.
  const qSkeleton = skeleton(rawQuery);
  const queryIsPersian = hasPersianScript(rawQuery);

  const name = normalizeFa(t.name);
  const bareName = normalizeFa(stripDecorations(t.name));
  const nameEn = normalizeEn(t.name);
  const artistText = t.artist.join(" ");
  const artists = t.artist.map(normalizeFa);
  const artistTextFa = normalizeFa(artistText);
  const artistEn = normalizeEn(artistText);
  const album = normalizeFa(t.album ?? "");

  let score = 0;

  // Title matches, strongest first.
  score += 6 * fieldMatch(bareName, q);
  score += 4 * fieldMatch(name, q);
  if (nameEn && qEn) score += 4 * fieldMatch(nameEn, qEn);
  if (qTranslit && nameEn) score += 3.5 * fieldMatch(nameEn, qTranslit);

  // Artist matches.
  for (const a of artists) score += 2.5 * fieldMatch(a, q);
  score += 1.5 * fieldMatch(artistTextFa, q);
  if (artistEn && qEn) score += 1.5 * fieldMatch(artistEn, qEn);
  if (qTranslit && artistEn) score += 1.5 * fieldMatch(artistEn, qTranslit);

  // Album match (weakest signal).
  score += 0.75 * fieldMatch(album, q);
  if (album && qEn) score += 0.75 * fieldMatch(normalizeEn(t.album ?? ""), qEn);

  // Cross-script: compare consonant skeletons of the whole query against each
  // word of the romanised fields. Only applied to Persian queries, and only
  // above a threshold, so ordinary Latin queries are unaffected.
  if (queryIsPersian && qSkeleton.length >= 3) {
    score += 5 * skeletonMatch(qSkeleton, nameEn);
    score += 3 * skeletonMatch(qSkeleton, artistEn);
    if (album) score += 1 * skeletonMatch(qSkeleton, normalizeEn(t.album ?? ""));
    // A curated alias is an exact, trusted mapping — reward it strongly.
    const alias = latinAliasFor(rawQuery);
    if (alias) {
      const aliasEn = normalizeEn(alias);
      const artistNorm = normalizeEn(artistText);
      if (artistNorm === aliasEn) score += 8;
      else if (aliasEn && artistNorm.includes(aliasEn)) score += 6;
    }
  }

  // Multi-word queries: reward rows that contain every token somewhere.
  const tokens = q.split(" ").filter((w) => w.length > 1);
  if (tokens.length > 1) {
    const hay = `${name} ${artistTextFa} ${album}`;
    const all = tokens.every((w) => hay.includes(w));
    if (all) score += 2.5;
    else score -= 1.5; // penalise partial matches so they sink
  }

  // Prefer primary artist (first in the array) over featured ones.
  if (artists[0] && fieldMatch(artists[0], q) > 0) score += 0.75;

  // Shorter titles are usually the canonical song, not a remix/extended mix.
  const tokensInName = titleTokens(t.name).length;
  if (tokensInName <= 4) score += 0.5;

  return score;
}

/**
 * Best skeleton similarity between the query and any single word of `latin`.
 * Word-level comparison keeps a multi-word artist name from diluting the
 * match, and the threshold keeps unrelated names from creeping in.
 */
function skeletonMatch(qSkeleton: string, latin: string): number {
  if (!latin) return 0;
  const words = latin.split(" ").filter((w) => w.length >= 3);
  if (!words.length) return 0;
  let best = 0;
  for (const w of words) {
    const s = similarity(qSkeleton, skeleton(w));
    if (s > best) best = s;
    if (best >= 0.99) break;
  }
  return best >= 0.7 ? best : 0;
}

/** Deduplicate by source:id, then by a normalised "name|artist" key. */
export function dedupeTracks(tracks: Track[]): Track[] {
  const seenId = new Set<string>();
  const seenFuzzy = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    const id = trackKey(t);
    if (seenId.has(id)) continue;
    const fuzzy = `${normalizeFa(stripDecorations(t.name))}|${normalizeFa(t.artist[0] ?? "")}`;
    if (seenFuzzy.has(fuzzy)) continue;
    seenId.add(id);
    seenFuzzy.add(fuzzy);
    out.push(t);
  }
  return out;
}

/**
 * Score → sort → dedupe. Rows that don't match at all are dropped unless the
 * caller asks to keep them (used for "browse" style queries).
 */
export function rankTracks(
  tracks: Track[],
  query: string,
  {
    keepUnmatched = false,
    iranianBoost = 2.5,
    weights,
  }: {
    keepUnmatched?: boolean;
    iranianBoost?: number;
    /** Per-track multiplier, e.g. to favour rows found via a curated alias. */
    weights?: Map<string, number>;
  } = {},
): Track[] {
  const persian = hasPersianScript(query);
  const scored = tracks.map((t) => {
    let s = scoreTrack(t, query);
    if (s > 0 && iranianBoost > 0 && isIranianTrack(t)) s += iranianBoost;
    // A curated catalogue outranks a user-upload mirror for the same score.
    s *= sourceTrust(t.source, persian);
    const w = weights?.get(trackKey(t));
    if (w !== undefined) s *= w;
    return { t, s };
  });
  const matched = scored.filter((x) => x.s > 0);
  const pool = keepUnmatched ? scored : matched;
  pool.sort((a, b) => b.s - a.s);
  return dedupeTracks(pool.map((x) => x.t));
}

/**
 * Build the list of upstream queries to try, most important first.
 * A Persian query yields the original string, a diacritic-stripped variant and
 * a romanised variant, so latin-indexed catalogues are covered too.
 */
export function queryVariants(raw: string, max = 3): string[] {
  const base = raw.trim();
  if (!base) return [];

  // The curated alias comes first for Persian queries: it is the only variant
  // the providers actually recognise for Iranian music.
  const alias = needsAlias(base) ? resolveLatinQuery(base) : null;

  const out: string[] = [];
  if (alias) out.push(alias);
  out.push(base);

  const folded = normalizeFa(base);
  if (folded && !out.includes(folded)) out.push(folded);
  const bare = stripDecorations(base);
  if (bare && !out.includes(bare)) out.push(bare);
  // Last resort: a guessed romanisation. Rarely matches, but costs nothing.
  const translit = transliterateFa(base);
  if (translit && /[a-z]{3}/i.test(translit) && !out.includes(translit)) out.push(translit);

  return [...new Set(out)].slice(0, max);
}
