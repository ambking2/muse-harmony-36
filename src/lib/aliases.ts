import { normalizeFa } from "./text";

/**
 * Persian → Latin alias table.
 *
 * Why this exists: the upstream providers do **not** index Iranian music under
 * Persian script. Searching "محسن یگانه" against NetEase returns nothing at
 * all; searching "Mohsen Yeganeh" returns his catalogue. So to make Persian
 * search work at all, a Persian query has to be translated into the Latin name
 * the provider actually uses.
 *
 * Algorithmic transliteration cannot do this reliably: Arabic script omits
 * short vowels, so "محسن" and "Mohsen" share no vowels to recover and a
 * letter-by-letter romanisation yields "mhsn", which matches nothing. The
 * mapping between the two spellings is a naming convention, not an algorithm,
 * so it has to be curated.
 *
 * Keys are normalised with `normalizeFa`, so Arabic ي/ك, ZWNJ and diacritics
 * all resolve to the same entry. Values are the exact Latin strings the
 * providers index.
 */

/** Well-known Iranian artists: Persian name → Latin name. */
const ARTIST_ALIASES: Record<string, string> = {
  // پاپ و معاصر
  "محسن یگانه": "Mohsen Yeganeh",
  "محسن يگانه": "Mohsen Yeganeh",
  بنیامین: "Benyamin Behzad",
  "بنیامین بهزاد": "Benyamin Behzad",
  "بنیامين بهزاد": "Benyamin Behzad",
  "پرواز همای": "Parvaz Homay",
  "پرواز هماي": "Parvaz Homay",
  ستار: "Sattar",
  "رضا شیرازی": "Reza Shirazi",
  "رضا شيرازي": "Reza Shirazi",
  معین: "Moein",
  معين: "Moein",
  "همایون شجری پور": "Homa",
  "همايون شجری پور": "Homa",
  حمیرا: "Hamira",
  حميرا: "Hamira",
  سوسن: "Susan",
  "شهرام شب پره": "Shahram Shabpareh",
  گوگوش: "Googoosh",
  داریوش: "Dariush",
  "داریوش اقبالی": "Dariush Eghbali",
  "داریوش اقبالي": "Dariush Eghbali",
  "علیرضا طلیسچی": "Alireza Talischi",
  "علیرضا طلیسچی گلچهر": "Alireza Talischi",
  "مرتضی پاشایی": "Morteza Pashaei",
  "رضا بهرام": "Reza Bahram",
  "حسین علیزاده": "Hossein Alizadeh",
  "مهدی یراحمی": "Mehdi Yarrahi",
  "محسن چاوشی": "Mohsen Chavoshi",
  "محمدرضا شجری پور": "Mohammadreza Shajarian",
  "شهاب اکبری": "Shahab Akbari",
  "علیرضا شاه محمدی": "Alireza Shahmohammadi",
  "رضا صادقی": "Reza Sadeghi",
  "ایمان کردونی": "Iman Kardouni",
  "سیاوش قمیشی": "Siavash Ghomayshi",
  ابی: "Ebi",
  "محمدرضا چهارسو": "Mohammadreza Chaharsough",
  "پرواز چماوشی": "Parvaz Chamavoshi",
  "محسن نامجو": "Mohsen Namjoo",
  "علیرضا قربانی": "Alireza Ghorbani",
  "مجید خانی": "Majid Khani",
  "محمدرضا شجریان": "Mohammadreza Shajarian",
  "استاد شجریان": "Shajarian",
  "شهرام ناظری": "Shahram Nazari",
  "رزوبه نصری": "Roozbeh Nazari",
  رومیسکان: "Roozbeh",
  "حسین علیزاده و دنیا میرزایی": "Hossein Alizadeh",
  اندی: "Andy",
  "اندی مادادیان": "Andy Madadian",
  آریان: "Arian",
  "آریان اسدی": "Arian Asadi",
  علیرضا: "Alireza",

  // رپ و آندرگراند
  "امیر تتلو": "Amir Tataloo",
  "امیر تتلـو": "Amir Tataloo",
  هیچکس: "Hichkas",
  یاس: "Yas",
  "یاس محمدی": "Yas",
  پیشرو: "Pishro",
  قاف: "Ghaf",
  سورنا: "Sorena",
  "امیر آرمان": "Amir Arman",
  "بهزاد لیتو": "Behzad Leito",
  "کوروش یغمایی": "Kourosh Yaghmaei",
  پرانک: "Parank",
  "سپهر خلسه": "Sepehr Khalse",

  // خارج از کشور
  شهره: "Shohreh",
  نسرین: "Nesrin",
  "آرمان یاسایی": "Arman Yasai",

  // بین‌المللی ایرانی
  "سهراب ویایی": "Shorab Weyaee",
  "کیهان کلهر": "Kayhan Kalhor",
  "وحید تاج دل": "Vahid Taval",
  "محمدرضا چلیپا": "Mohammadreza Chalipa",
  بیکس: "Bixes",
  پریسا: "Parisa",
  نیلوفر: "Niloofar",
  ریحانه: "Reyhaneh",
};

/**
 * Signature Iranian songs: Persian title → Latin title.
 * These are the queries people actually type, so an exact hit is worth a lot.
 */
const SONG_ALIASES: Record<string, string> = {
  برای: "Baraye",
  چمدون: "Chamedoon",
  "دلم گرفته": "Delam Gerefte",
  "دلم گرفت": "Delam Gerefte",
  "کی خوشبختی": "Ki Khoshbakhti",
  "جان جان": "Jaan Jaan",
  خلیل: "Khalil",
  ساقی: "Saghi",
  قرار: "Gharar",
  "دوست دارم": "Doost Daram",
  قاصدک: "Ghasedak",
  "چرا رفتی": "Chera Rafti",
  نفس: "Nafas",
  ثانیه: "Sanie",
  تقدیر: "Taghdir",
  ستاره: "Setareh",
  خاطره: "Khatereh",
  زخم: "Zakhm",
  انگار: "Engezar",
  باران: "Baran",
  چشم: "Cheshm",
  درد: "Dard",
  تنها: "Tanha",
  "خاطره ها": "Khatereha",
  ایران: "Iran",
  مریم: "Maryam",
  آرام: "Aram",
  چنین: "Chenin",
  "باران نمی‌بارد": "Baran Namibarad",
  طوفان: "Tofan",
  "ماه و ستاره": "Mah o Setareh",
};

/** Genre and mood queries that are far more useful in Latin upstream. */
const GENRE_ALIASES: Record<string, string> = {
  "پاپ ایرانی": "Iranian pop",
  "پاپ فارسی": "Persian pop",
  "موسیقی ایرانی": "Iranian music",
  "موسیقی فارسی": "Persian music",
  "سینمایی ایرانی": "Irani film music",
  "موسیقی سینمایی ایرانی": "Irani soundtrack",
  "رپ فارسی": "Persian rap",
  "رپ ایرانی": "Persian rap",
  "هیپ هاپ فارسی": "Persian hip hop",
  "موسیقی سنتی ایرانی": "Iranian traditional music",
  "موسیقی سنتی": "Persian traditional music",
  "دسته بند ملایران": "Dastbandi",
  "دسته‌بند ملایران": "Dastbandi",
  "موسیقی بی کلام": "Instrumental",
  "بی کلام": "Instrumental",
  "موسیقی کلاسیک": "Classical music",
  "ترانه های قدیمی": "Old Persian songs",
  "آهنگ قدیمی": "Old Persian songs",
  "موسیقی ملای": "Persian classical music",
};

const ALL: Record<string, string> = {
  ...GENRE_ALIASES,
  ...SONG_ALIASES,
  ...ARTIST_ALIASES,
};

/** Look up a Persian phrase in the alias table. Exact normalised match only. */
export function latinAliasFor(phrase: string): string | null {
  const key = normalizeFa(phrase).replace(/\s+/g, " ");
  if (!key) return null;
  return ALL[key] ?? null;
}

/**
 * Resolve a full query to the best Latin search term, or null when we have no
 * alias for it. Whole-query aliases win; otherwise any recognised word inside
 * the query is substituted, so "آهنگ محسن یگانه" still finds Mohsen Yeganeh.
 */
export function resolveLatinQuery(query: string): string | null {
  const whole = latinAliasFor(query);
  if (whole) return whole;

  const words = query.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  // Try the longest known phrase contained in the query ("پاپ ایرانی" inside
  // a longer sentence), then fall back to replacing single known words.
  let best: { len: number; value: string } | null = null;
  for (let size = Math.min(4, words.length); size >= 1; size--) {
    for (let i = 0; i + size <= words.length; i++) {
      const slice = words.slice(i, i + size).join(" ");
      const hit = latinAliasFor(slice);
      if (hit) {
        if (!best || size > best.len) best = { len: size, value: hit };
      }
    }
  }
  return best?.value ?? null;
}

/** True when the query itself is Persian script and therefore needs an alias. */
export function needsAlias(query: string): boolean {
  return /[؀-ۿ]/.test(query);
}
