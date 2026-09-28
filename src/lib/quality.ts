import type { Track } from "./types";
import { normalizeFa, normalizeEn, hasPersianScript } from "./text";

/**
 * Junk filter.
 *
 * The JOOX provider is not a curated music catalogue — it mirrors whatever was
 * uploaded, so its results for a Persian query are dominated by:
 *   • AI-generated "آهنگ" uploads ("آهنگ هوش مصنوعی …")
 *   • SEO-spam channels ("Music FP", "Farsi Band", "موزیک محلی")
 *   • street-performer and cover compilations
 *   • explicit uploads, which the provider does not label
 *
 * Left unfiltered these outrank the real artist, because their titles repeat
 * the query term verbatim. So they are dropped before ranking rather than
 * merely down-ranked.
 *
 * Markers are split by script. A Persian marker must be matched against the
 * Persian haystack and a Latin marker against the Latin one: `normalizeEn`
 * strips non-ASCII entirely, so a Persian marker folded into Latin becomes an
 * empty string — and every string contains the empty string.
 */

/** Aggregator / auto-generated channel names. */
const JUNK_ARTISTS_FA = [
  "موزیک محلی",
  "آهنگ های محلی",
  "دنیای موزیک",
  "آهنگ محلی",
  "موزیک فارسی",
  "آهنگ فارسی",
  "کانال آهنگ",
  "تک آهنگ",
  "موزیک ایرانی",
  "پلی لیست ایرانی",
  "موزیک گستر",
  "صدای ایران",
  "آهنگ جدید",
  "موسیقی محلی",
  "کانال موزیک",
  "موزیک یار",
  "موسیقی خراسانی",
];

const JUNK_ARTISTS_EN = [
  "music fp",
  "farsi band",
  "ahange gham",
  "top money mahali",
  "parsi tone",
  "deedar production",
  "persia ai",
  "ahangestan",
  "mohaddethat",
  "yektamusic",
  "tarafdarona",
  "pars music",
  "ahang mp3",
  "shervin music",
  "be panah",
  "ethnique musician",
  "ethnic musicians",
  "dj beth",
  "muzic",
  "ghesa",
  "harmophonic",
  "moonlight cave",
  "speedy justice",
  "sanam ahang",
  "abu usman",
  "shaista sandara",
  "falcon of songs",
];

/** Non-music channels: spoken word, lecture, poetry. */
const NOISE_ARTISTS_FA = [
  "persian mystic poems",
  "mohammad yeganeh",
  "iraj bastami",
  "farhang holakouee",
];

/** Markers of AI-generated or SEO-farm uploads. */
const JUNK_TITLE_FA = [
  "هوش مصنوعی",
  "هوش مصنفی",
  "تک آهنگ",
  "دورهمی",
  "کنسرت زنده",
  "لیست پخش",
  "حاشیه",
  "تیزر",
  "آهنگ ایرانی جدید",
  "دانلود آهنگ",
  "آهنگ جدید",
  "موسیقی سینمایی ایرانی",
  "نسخه هوش مصنوعی",
  "موزیک محلی",
  "آهنگ محلی",
];

const JUNK_TITLE_EN = [
  "ai music",
  "artificial intelligence",
  "ai cover",
  "ai singer",
  "voice ai",
  "playlist",
  "nonstop",
  "top hits",
  "best of",
  "collection",
  "compilation",
  "cover by",
  "remix by",
  "mix 20",
  "new song 20",
  "download mp3",
];

/** Street / cover / tribute uploads rather than the original release. */
const COVER_FA = [
  "اجرای خیابانی",
  "اجرای زنده",
  "خیابانی",
  "کوچه",
  "ریمیکس",
  "تپس",
  "کاور",
  "بی کی",
  "دورهمی",
  "ادای احترام",
  "تجلیل از",
  "بازخوانی",
  "ارکستر",
  "سنتور نوازی",
  "تکرار کننده",
  "نوازش",
  "تمرین",
  "کوچه گردی",
  "زنده در",
  "بی کلام اجرا",
  "تقلید صدای",
  "تقلید",
  "کپی برابر",
  "شبیه سازی",
];

const COVER_EN = [
  "street musician",
  "street performance",
  "cover band",
  "tribute",
  "karaoke",
  "mashup",
  "medley",
  "bootleg",
  "live session",
  "unplugged",
  "remix",
  "8d audio",
  "sped up",
  "slowed",
  "reverb",
  "nightcore",
  "acoustic cover",
];

/**
 * Explicit content markers. The provider does not flag these, so we must.
 * Matched against word-ish boundaries where practical — "anal" and "cum" are
 * short enough to appear inside innocent words.
 */
const EXPLICIT_EN = [
  "explicit",
  "sexo",
  "porn",
  "pussy",
  "dick",
  "cock",
  "sperm",
  "cum",
  "blowjob",
  "nude",
  "nudes",
  "hentai",
  "onlyfans",
  "escort",
  "horny",
  "masturbat",
  "bdsm",
  "fetish",
  "milf",
  "blow job",
  "dildo",
  "hardcore",
  "lapdance",
  "18 plus",
  "nsfw",
  "sex toy",
  "orgasm",
  "erotic",
  "handjob",
  "creampie",
];

/** Pre-normalised, so matching is a plain substring test. */
const pre = (list: string[], fn: (s: string) => string) => list.map(fn).filter((s) => s.length > 0);

const JUNK_ARTIST_FA_N = pre(JUNK_ARTISTS_FA, normalizeFa);
const JUNK_ARTIST_EN_N = pre(JUNK_ARTISTS_EN, normalizeEn);
const NOISE_ARTIST_FA_N = pre(NOISE_ARTISTS_FA, normalizeFa);
const JUNK_TITLE_FA_N = pre(JUNK_TITLE_FA, normalizeFa);
const JUNK_TITLE_EN_N = pre(JUNK_TITLE_EN, normalizeEn);
const COVER_FA_N = pre(COVER_FA, normalizeFa);
const COVER_EN_N = pre(COVER_EN, normalizeEn);
const EXPLICIT_EN_N = pre(EXPLICIT_EN, normalizeEn);

/** Whole-word test for short markers that would otherwise match inside words. */
const SHORT = new Set(["cum", "xxx", "18 plus", "dildo", "sexo", "cock", "dick", "nude"]);

function hasMarker(haystack: string, markers: string[]): boolean {
  for (const m of markers) {
    if (!haystack.includes(m)) continue;
    if (!SHORT.has(m)) return true;
    // Require a word boundary for the short, collision-prone ones.
    const re = new RegExp(`(^|\\s)${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
    if (re.test(haystack)) return true;
  }
  return false;
}

/** True when the row is explicit and must never be shown. */
export function isExplicit(t: Track): boolean {
  const en = normalizeEn(`${t.name} ${t.artist.join(" ")} ${t.album ?? ""}`);
  return hasMarker(en, EXPLICIT_EN_N);
}

/**
 * True when the row is auto-generated, SEO spam or a cover upload. The
 * original release of the same song is always a separate row, so dropping
 * these loses nothing real.
 */
export function isJunk(t: Track): boolean {
  if (isExplicit(t)) return true;

  const raw = `${t.name} ${t.artist.join(" ")} ${t.album ?? ""}`;
  const en = normalizeEn(raw);
  const fa = normalizeFa(raw);
  const artistEn = normalizeEn(t.artist.join(" "));
  const artistFa = normalizeFa(t.artist.join(" "));

  if (hasMarker(artistFa, NOISE_ARTIST_FA_N)) return true;
  if (hasMarker(artistFa, JUNK_ARTIST_FA_N)) return true;
  if (hasMarker(artistEn, JUNK_ARTIST_EN_N)) return true;
  if (hasMarker(fa, JUNK_TITLE_FA_N)) return true;
  if (hasMarker(en, JUNK_TITLE_EN_N)) return true;
  if (hasMarker(fa, COVER_FA_N)) return true;
  if (hasMarker(en, COVER_EN_N)) return true;

  // SEO spam: a keyword-stuffed title masquerading as a track name.
  if (t.name.length > 80) return true;

  return false;
}

/** Remove junk rows from a result set. */
export function filterJunk(tracks: Track[]): Track[] {
  return tracks.filter((t) => !isJunk(t));
}

/**
 * How much to trust a provider for the current query. Netease is a curated
 * catalogue; JOOX is a user-upload mirror, so on a Persian query its rows are
 * only used when nothing curated came back.
 */
export function sourceTrust(source: Track["source"], persianQuery: boolean): number {
  if (source === "netease") return 1;
  if (source === "kuwo") return 0.8;
  return persianQuery ? 0.35 : 0.7;
}

export { hasPersianScript };
