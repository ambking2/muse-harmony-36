/**
 * Provider-backed music collections. Each card points to a public NetEase
 * playlist ID; the detail page requests the provider's actual track list.
 * These are collection references, not locally fabricated song records.
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
    title: "پاپ و پاپ‌-راک فارسی",
    blurb: "مجموعه‌ای از پاپ‌های فارسی",
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
    blurb: "موسیقی سنتی و سازهای ایرانی",
    emoji: "🪕",
  },
  {
    id: "4895623116",
    title: "عود و نی",
    blurb: "موسیقی بی‌کلام با عود و نی",
    emoji: "🎼",
  },
  {
    id: "3778678",
    title: "ترانه‌های پرطرفدار",
    blurb: "جدول آهنگ‌های محبوب نت‌ایز",
    emoji: "🔥",
  },
  {
    id: "3779629",
    title: "تازه‌های موسیقی",
    blurb: "جدول آهنگ‌های تازه منتشرشده",
    emoji: "✨",
  },
  {
    id: "19723756",
    title: "آهنگ‌های در حال اوج",
    blurb: "جدول آهنگ‌هایی که محبوبیتشان رو به افزایش است",
    emoji: "📈",
  },
  {
    id: "2884035",
    title: "آثار مستقل",
    blurb: "جدول موسیقی اورجینال و مستقل",
    emoji: "🎙️",
  },
  {
    id: "991319590",
    title: "پاپ غربی",
    blurb: "آهنگ‌های محبوب غربی",
    emoji: "🌍",
  },
  {
    id: "745956260",
    title: "الکترونیک و رقص",
    blurb: "موسیقی الکترونیک پرانرژی",
    emoji: "🪩",
  },
  {
    id: "71385702",
    title: "انیمه و بازی",
    blurb: "موسیقی مرتبط با انیمه و بازی‌های ویدیویی",
    emoji: "🎮",
  },
  {
    id: "10520166",
    title: "موسیقی کره‌ای",
    blurb: "مجموعه‌ای از موسیقی کره‌ای",
    emoji: "🇰🇷",
  },
  {
    id: "21845217",
    title: "فولک و آکوستیک",
    blurb: "آهنگ‌های فولک و آکوستیک",
    emoji: "🎻",
  },
];
