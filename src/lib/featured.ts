/**
 * Provider-backed public NetEase playlists.
 *
 * These cards link to provider playlist IDs. The detail page loads real tracks
 * from the catalogue; no songs are fabricated from search results.
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
    blurb: "آثار اورجینال و مستقل",
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
  {
    id: "991319590",
    title: "رپ و هیپ‌هاپ",
    blurb: "موسیقی رپ و هیپ‌هاپ",
    emoji: "🎤",
  },
  {
    id: "60198",
    title: "پاپ بین‌المللی",
    blurb: "منتخب موسیقی پاپ بین‌المللی",
    emoji: "🌍",
  },
  {
    id: "180106",
    title: "موسیقی بریتانیایی",
    blurb: "منتخب موسیقی و ترانه‌های بریتانیایی",
    emoji: "🇬🇧",
  },
  {
    id: "21845217",
    title: "هیت‌های غربی",
    blurb: "ترانه‌های محبوب بین‌المللی",
    emoji: "🌎",
  },
  {
    id: "745956260",
    title: "تازه‌های موسیقی غربی",
    blurb: "تازه‌های پاپ و موسیقی بین‌المللی",
    emoji: "🆕",
  },
];
