/**
 * Persian/Arabic text utilities.
 *
 * Upstream music providers index titles inconsistently: some use Persian ی/ک,
 * some use Arabic ي/ك, some add ZWNJ, some write Persian digits, some romanise
 * the artist name. Everything here exists to make a user-typed Persian string
 * match any of those shapes.
 */

/** Arabic → Persian letter folding, plus every invisible/decorative codepoint. */
const CHAR_MAP: Record<string, string> = {
  // yeh / kaf
  ي: "ی", // ARABIC YEH -> FARSI YEH
  ى: "ی", // ALEF MAKSURA -> FARSI YEH
  ے: "ی", // YEH BARREE -> FARSI YEH
  ك: "ک", // ARABIC KAF -> KEHEH
  ڪ: "ک", // SWASH KAF -> KEHEH
  ګ: "گ", // GAF
  // alef family
  أ: "ا", // ALEF WITH HAMZA ABOVE
  إ: "ا", // ALEF WITH HAMZA BELOW
  آ: "ا", // ALEF WITH MADDA
  ٱ: "ا", // ALEF WASLA
  ٲ: "ا", // ALEF WITH RIGHT HALF RING
  ٳ: "ا", // ALEF WITH LEFT HALF RING
  // heh family
  ة: "ه", // TEH MARBUTA -> HEH
  ۀ: "ه", // HEH WITH YEH ABOVE
  ە: "ه", // AE
  ؤ: "و", // WAW WITH HAMZA
  ئ: "ی", // YEH WITH HAMZA
  ء: "", //   HAMZA
  // persian digits -> latin
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  // arabic digits -> latin
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  // punctuation that should behave as a separator
  "–": " ", // EN DASH
  "—": " ", // EM DASH
  ـ: "", //   TATWEEL
  "،": " ", // ARABIC COMMA
  "؛": " ", // ARABIC SEMICOLON
  "؟": " ", // ARABIC QUESTION MARK
  "٫": " ", // ARABIC DECIMAL SEPARATOR
  "٬": " ", // ARABIC THOUSANDS SEPARATOR
  "۔": " ", // ARABIC FULL STOP
};

/** Diacritics (harakat), superscript alef, and Quranic annotation marks. */
const DIACRITIC_RE = /[ً-ْٰٟۖ-ۭ]/g;
/**
 * ZWNJ / ZWJ join or separate words, so they become a separator — "بنیامین‌بهزاد"
 * is one word joined, but alias lookups treat it as the two words "بنیامین" and
 * "بهزاد". The rest (BOM, soft hyphen) vanish entirely.
 */
const JOINER_RE = /[\u200c\u200d]/g;
const INVISIBLE_RE = /[\u2060\u00ad\ufeff]/g;
const WHITESPACE_RE = /\s+/g;

const PERSIAN_RANGE = /[؀-ۿݐ-ݿ]/;

/** True when the string contains at least one Arabic/Persian-script letter. */
export function hasPersianScript(s: string): boolean {
  return PERSIAN_RANGE.test(s);
}

/**
 * Canonical form used for every comparison: folded letters, no diacritics,
 * no invisible characters, lowercase, single-spaced.
 */
export function normalizeFa(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .replace(DIACRITIC_RE, "")
    .replace(JOINER_RE, " ")
    .replace(INVISIBLE_RE, "")
    .toLowerCase()
    .split("")
    .map((ch) => (ch in CHAR_MAP ? CHAR_MAP[ch] : ch))
    .join("")
    .replace(/[«»"'“”‘’()[\]{}<>/\\|~^_=+*&%$#@?!.,:;]/g, " ")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

/** Latin-folding for the Latin half of the problem (diacritics, smart quotes). */
export function normalizeEn(input: string): string {
  return (input ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Strip a trailing "(feat. …)", "- Remastered 2011", "[Official Video]" tail. */
export function stripDecorations(title: string): string {
  return title
    .replace(/[([][^)\]]{0,60}[)\]]/g, " ")
    .replace(
      /\s+-\s+(remaster(ed)?|radio edit|single version|album version|explicit|official[\s\S]*|live)[\s\S]*$/i,
      " ",
    )
    .replace(WHITESPACE_RE, " ")
    .trim();
}

/** The significant words of a title, for looser matching. */
export function titleTokens(title: string): string[] {
  return normalizeFa(stripDecorations(title)).split(" ").filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Cross-script matching
 *
 * Providers index Iranian music under romanised names ("Mohsen Yeganeh",
 * not "محسن یگانه"). Naive letter-by-letter romanisation cannot work here:
 * Arabic script does not write short vowels, so "محسن" has no 'o' or 'e' to
 * recover and comes out as "mhsn".
 *
 * Instead we compare *consonant skeletons* — the letters that both scripts
 * agree on. "محسن" → "mhsn" and "Mohsen" → "mhsn"; "یگانه" → "ygnh" and
 * "Yeganeh" → "ygnh". Exact where it counts, and a small edit distance covers
 * the spellings that still differ.
 * ------------------------------------------------------------------ */

/** Persian letters → their romanised consonant identity. */
const CONSONANT_MAP: Record<string, string> = {
  آ: "a",
  ا: "a",
  أ: "a",
  إ: "a",
  ٱ: "a",
  ب: "b",
  پ: "p",
  ت: "t",
  ث: "s",
  ج: "j",
  چ: "ch",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  ژ: "zh",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "z",
  ط: "t",
  ظ: "z",
  ع: "",
  غ: "gh",
  ف: "f",
  ق: "gh",
  ک: "k",
  گ: "g",
  ل: "l",
  م: "m",
  ن: "n",
  و: "v",
  ه: "h",
  ة: "h",
  ی: "y",
  ئ: "y",
};

const LATIN_SKELETON_RE = /[^a-z]/g;
const LATIN_VOWELS_RE = /[aeiou]/g;

/**
 * Vowel-stripped consonant skeleton. Works on Persian and Latin input alike,
 * so "محسن یگانه" and "Mohsen Yeganeh" both reduce to "mhsnygnh".
 *
 * The vowel has to come off the Latin side too: Arabic script never writes the
 * short vowels that "Mohsen" and "Yeganeh" are full of, so keeping them would
 * make the two skeletons incomparable.
 */
export function skeleton(input: string): string {
  if (!input) return "";
  const fa = normalizeFa(input);
  if (hasPersianScript(fa)) {
    return (
      fa
        .split("")
        .filter((ch) => ch === " " || ch in CONSONANT_MAP)
        .map((ch) => CONSONANT_MAP[ch] ?? " ")
        .join("")
        // Persian alef only ever carries a long /aː/, which the Latin side drops
        // as a vowel — so it has to go here too, or the two never line up.
        .replace(/a/g, "")
        .replace(WHITESPACE_RE, "")
    );
  }
  return normalizeEn(fa).replace(LATIN_VOWELS_RE, "").replace(LATIN_SKELETON_RE, "");
}

/** Classic Levenshtein distance, two-row implementation. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur.slice();
  }
  return prev[b.length];
}

/**
 * Similarity of two strings on a 0..1 scale, tolerant of the small spelling
 * differences that separate romanised variants of the same Persian name.
 */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  // One skeleton containing the other is a strong signal (added word/suffix).
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.7 + 0.25 * ratio;
  }
  const dist = editDistance(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

/**
 * Best-effort romanisation of a Persian phrase, used to build a Latin search
 * term. Vowels are guessed from common Persian spelling patterns, so the
 * result is a good *query*, never a reliable rendering of the name — matching
 * is done on skeletons, not on this string.
 */
const VOWEL_BY_FOLLOWER: [RegExp, string][] = [
  // A consonant followed by another consonant usually hides an 'a' or 'e'.
  [/([بپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی])(?=[بپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی])/g, "$1a"],
  // Final clusters commonly end in 'e' (e.g. "چمدون" → chomedoon-ish).
  [/([bdjknstvfylmnrg])$/g, "$1e"],
];

export function transliterateFa(input: string): string {
  let out = normalizeFa(input);
  if (!out || !hasPersianScript(out)) return normalizeEn(out);
  for (const [re, rep] of VOWEL_BY_FOLLOWER) out = out.replace(re, rep);
  return out
    .split("")
    .map((ch) => CONSONANT_MAP[ch] ?? (ch === " " ? " " : ""))
    .join("")
    .replace(WHITESPACE_RE, " ")
    .trim();
}
