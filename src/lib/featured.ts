/**
 * Curated collections backed by real NetEase playlist IDs.
 *
 * Each card opens the provider playlist endpoint; tracks are loaded from the
 * catalogue at runtime, rather than being fabricated from search results.
 * Keep entries here only when the ID belongs to a known public playlist.
 */
export interface FeaturedPlaylist {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
}

export const FEATURED_PLAYLISTS: FeaturedPlaylist[] = [
  {
    id: "168971630",
    title: "پاپ و پاپ‌راک فارسی",
    blurb: "سیروان خسروی، میلاد بابایی و دیگر پاپ‌های محبوب",
    emoji: "🎧",
  },
  {
    id: "877430953",
    title: "گلوله‌های پاپ",
    blurb: "مجموعه‌ای از صداهای پاپ معاصر",
    emoji: "💿",
  },
  {
    id: "7223191024",
    title: "موسیقی سنتی ایران",
    blurb: "حال‌وهوای موسیقی سنتی و سازهای ایرانی",
    emoji: "🪕",
  },
  {
    id: "4895623116",
    title: "عود و نی",
    blurb: "موسیقی سازی و ملودی‌های آرام",
    emoji: "🎼",
  },
  {
    id: "2829883282",
    title: "پاپ چینی و آسیایی",
    blurb: "منتخب موسیقی پاپ چینی",
    emoji: "🌏",
  },
  {
    id: "2829816518",
    title: "پاپ انگلیسی و غربی",
    blurb: "موسیقی پاپ بین‌المللی",
    emoji: "🌍",
  },
  {
    id: "2829896389",
    title: "پاپ ژاپنی",
    blurb: "ترانه‌های پاپ ژاپنی",
    emoji: "🇯🇵",
  },
  {
    id: "991319590",
    title: "رپ و هیپ‌هاپ",
    blurb: "مجموعه‌ای از قطعه‌های رپ",
    emoji: "🎤",
  },
  {
    id: "1978921795",
    title: "الکترونیک و رقص",
    blurb: "ریتم‌های الکترونیک پرانرژی",
    emoji: "🪩",
  },
  {
    id: "5059633707",
    title: "راک",
    blurb: "منتخب موسیقی راک",
    emoji: "🎸",
  },
  {
    id: "71384707",
    title: "موسیقی کلاسیک",
    blurb: "قطعه‌های کلاسیک برای شنیدن با تمرکز",
    emoji: "🎻",
  },
  {
    id: "2900343697",
    title: "موسیقی فیلم و سریال",
    blurb: "ترانه‌های برگزیده از آثار تصویری",
    emoji: "🎬",
  },
  {
    id: "2829821753",
    title: "تمرکز و مطالعه",
    blurb: "موسیقی پس‌زمینه برای کار و مطالعه",
    emoji: "📚",
  },
  {
    id: "2890501416",
    title: "آرامش و خواب",
    blurb: "صداهای آرام برای استراحت",
    emoji: "🌙",
  },
  {
    id: "3778678",
    title: "ترانه‌های محبوب",
    blurb: "فهرست پربازدید موسیقی در کاتالوگ",
    emoji: "🔥",
  },
  {
    id: "3455816",
    title: "ترانه‌های کلاسیک کانتونی",
    blurb: "آهنگ‌های خاطره‌انگیز کانتونی",
    emoji: "📻",
  },
];
