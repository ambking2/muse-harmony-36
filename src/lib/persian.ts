// Persian/Farsi artist aliases and helpers to boost Iranian music discovery.
// Maps between common Latin transliterations and Persian script so users can
// search either way.

export const PERSIAN_ARTIST_ALIASES: Record<string, string[]> = {
  moein: ["معین", "Moein", "Moein Iran"],
  ebi: ["ابی", "Ebi"],
  dariush: ["داریوش", "Dariush Eghbali", "Dariush"],
  googoosh: ["گوگوش", "Googoosh"],
  hayedeh: ["هایده", "Hayedeh"],
  mahasti: ["مهستی", "Mahasti"],
  sattar: ["ستار", "Sattar"],
  andy: ["اندی", "Andy"],
  shadmehr: ["شادمهر عقیلی", "شادمهر", "Shadmehr Aghili"],
  "shadmehr aghili": ["شادمهر عقیلی", "شادمهر"],
  "siavash ghomayshi": ["سیاوش قمیشی", "Siavash Ghomayshi"],
  "siavash shams": ["سیاوش شمس", "Siavash Shams"],
  aref: ["عارف", "Aref"],
  homayoun: ["همایون شجریان", "Homayoun Shajarian"],
  shajarian: ["محمدرضا شجریان", "Shajarian"],
  mansour: ["منصور", "Mansour"],
  moe: ["معین"],
  benyamin: ["بنیامین بهادری", "Benyamin Bahadori"],
  mohsen: ["محسن یگانه", "محسن چاوشی", "Mohsen Yeganeh", "Mohsen Chavoshi"],
  yeganeh: ["محسن یگانه", "Mohsen Yeganeh"],
  chavoshi: ["محسن چاوشی", "Mohsen Chavoshi"],
  reza: ["رضا صادقی", "رضا یزدانی", "Reza Sadeghi"],
  sadeghi: ["رضا صادقی", "Reza Sadeghi"],
  yazdani: ["رضا یزدانی", "Reza Yazdani"],
  ehsan: ["احسان خواجه امیری", "Ehsan Khajeh Amiri"],
  "ehsan khajeh amiri": ["احسان خواجه امیری"],
  sirvan: ["سیروان خسروی", "Sirvan Khosravi"],
  "sirvan khosravi": ["سیروان خسروی"],
  aliyar: ["علیار", "Aliyar"],
  xaniar: ["زانیار خسروی", "Xaniar Khosravi"],
  "zanyar khosravi": ["زانیار خسروی"],
  yas: ["یاس", "Yas"],
  hichkas: ["هیچکس", "Hichkas"],
  tataloo: ["امیر تتلو", "Amir Tataloo"],
  putak: ["پوتک", "Putak"],
  arash: ["آرش", "Arash"],
  "morteza pashaei": ["مرتضی پاشایی", "Morteza Pashaei"],
  pashaei: ["مرتضی پاشایی"],
  hamid: ["حمید هیراد", "حمید عسکری", "Hamid Hiraad"],
  hiraad: ["حمید هیراد", "Hamid Hiraad"],
  masih: ["مسیح", "Masih & Arash Ap"],
  "arash ap": ["آرش ای پی", "Arash AP"],
  bijan: ["بیژن مرتضوی", "Bijan Mortazavi"],
};

// Farsi/Arabic script detection
const FARSI_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
export function isPersianScript(s: string) {
  return FARSI_RE.test(s);
}

/**
 * Return every search variant to try for a given query.
 * Includes the original + any known Persian↔Latin aliases + a "Persian"
 * suffix hint that helps NetEase surface Iranian results for Latin queries.
 */
export function expandQueryVariants(q: string): string[] {
  const raw = q.trim();
  if (!raw) return [];
  const key = raw.toLowerCase();
  const set = new Set<string>([raw]);
  const aliases = PERSIAN_ARTIST_ALIASES[key];
  if (aliases) aliases.forEach((a) => set.add(a));
  // If not already Persian script and no alias hit, add a "Persian" hint
  // to help gdmusic sources return Iranian catalog when relevant.
  if (!isPersianScript(raw) && !aliases) {
    // no-op; the hint variant is optional and can be noisy — keep off by default
  }
  return [...set];
}

// Common Persian/Iranian search seeds for the home page.
export const PERSIAN_SEEDS = [
  "معین",
  "ابی",
  "داریوش",
  "گوگوش",
  "شادمهر عقیلی",
  "سیاوش قمیشی",
  "محسن یگانه",
  "احسان خواجه امیری",
  "مرتضی پاشایی",
  "همایون شجریان",
];

export function isLikelyPersianTrack(t: { name: string; artist: string[]; album?: string }): boolean {
  if (isPersianScript(t.name)) return true;
  if (t.artist.some((a) => isPersianScript(a))) return true;
  if (t.album && isPersianScript(t.album)) return true;
  return false;
}