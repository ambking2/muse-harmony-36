/**
 * Real public NetEase playlist IDs used by the provider playlist endpoint.
 * Each card opens a provider playlist; tracks are fetched from the catalogue,
 * not synthesized from search results.
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
    blurb: "مجموعه‌ای از پاپ و پاپ‌راک",
    emoji: "🎧",
  },
  {
    id: "877430953",
    title: "گلچین پاپ",
    blurb: "ترانه‌های پاپ منتخب",
    emoji: "💿",
  },
  {
    id: "7223191024",
    title: "موسیقی سنتی ایران",
    blurb: "موسیقی سنتی و سازهای ایرانی",
    emoji: "🪕",
  },
  {
    id: "4895623116",
    title: "عود و نی",
    blurb: "موسیقی سازی و بی‌کلام",
    emoji: "🎼",
  },
  {
    id: "3778678",
    title: "ترانه‌های پرطرفدار",
    blurb: "فهرست محبوب‌های سرویس موسیقی",
    emoji: "🔥",
  },
  {
    id: "3779629",
    title: "تازه‌های موسیقی",
    blurb: "آهنگ‌های تازه در فهرست جدیدترین‌ها",
    emoji: "✨",
  },
  {
    id: "19723756",
    title: "آهنگ‌های رو به رشد",
    blurb: "ترانه‌هایی که در جدول صعود می‌کنند",
    emoji: "📈",
  },
  {
    id: "2884035",
    title: "موسیقی مستقل و اورجینال",
    blurb: "فهرست آثار اورجینال",
    emoji: "🎙️",
  },
  {
    id: "10520166",
    title: "موسیقی الکترونیک",
    blurb: "منتخب موسیقی الکترونیک",
    emoji: "🪩",
  },
  {
    id: "71385702",
    title: "موسیقی انیمه و بازی",
    blurb: "موسیقی انیمه، بازی و آثار تصویری",
    emoji: "🎮",
  },
];
