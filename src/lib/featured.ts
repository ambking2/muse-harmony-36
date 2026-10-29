/**
 * Provider-backed collections. Each ID points to a public NetEase playlist
 * or chart; the detail route fetches its real tracks from the music service.
 */
export type PlaylistGroup = "همه" | "ایرانی" | "حال‌وهوا" | "موقعیت" | "سبک" | "بین‌المللی";

export interface FeaturedPlaylist {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  group: Exclude<PlaylistGroup, "همه">;
}

export const FEATURED_PLAYLISTS: FeaturedPlaylist[] = [
  {
    id: "168971630",
    title: "پاپ و پاپ‌راک فارسی",
    blurb: "مجموعه‌ای از پاپ و پاپ‌راک فارسی",
    emoji: "🎧",
    group: "ایرانی",
  },
  {
    id: "877430953",
    title: "گلچین پاپ",
    blurb: "ترانه‌های پاپ منتخب",
    emoji: "💿",
    group: "ایرانی",
  },
  {
    id: "7223191024",
    title: "موسیقی سنتی ایران",
    blurb: "موسیقی سنتی و سازهای ایرانی",
    emoji: "🪕",
    group: "ایرانی",
  },
  {
    id: "4895623116",
    title: "عود و نی",
    blurb: "موسیقی سازی و بی‌کلام",
    emoji: "🎼",
    group: "ایرانی",
  },
  {
    id: "3778678",
    title: "ترانه‌های پرطرفدار",
    blurb: "جدول آهنگ‌های محبوب نت‌ایز",
    emoji: "🔥",
    group: "بین‌المللی",
  },
  {
    id: "3779629",
    title: "تازه‌های موسیقی",
    blurb: "جدول آهنگ‌های تازه منتشرشده",
    emoji: "✨",
    group: "بین‌المللی",
  },
  {
    id: "19723756",
    title: "آهنگ‌های در حال اوج",
    blurb: "جدول آهنگ‌هایی که محبوبیتشان رو به افزایش است",
    emoji: "📈",
    group: "بین‌المللی",
  },
  {
    id: "2884035",
    title: "موسیقی اورجینال",
    blurb: "جدول آثار اورجینال و مستقل",
    emoji: "🎙️",
    group: "سبک",
  },
  {
    id: "991319590",
    title: "رپ و هیپ‌هاپ",
    blurb: "جدول موسیقی رپ نت‌ایز",
    emoji: "🎤",
    group: "سبک",
  },
  {
    id: "1978921795",
    title: "الکترونیک و دنس",
    blurb: "جدول موسیقی الکترونیک پرانرژی",
    emoji: "🪩",
    group: "سبک",
  },
  {
    id: "71384707",
    title: "موسیقی کلاسیک",
    blurb: "جدول قطعه‌های موسیقی کلاسیک",
    emoji: "🎻",
    group: "سبک",
  },
  {
    id: "71385702",
    title: "انیمه و بازی",
    blurb: "موسیقی مرتبط با انیمه و بازی‌های ویدیویی",
    emoji: "🎮",
    group: "بین‌المللی",
  },
  {
    id: "745956260",
    title: "موسیقی کره‌ای",
    blurb: "جدول موسیقی کره‌ای",
    emoji: "🇰🇷",
    group: "بین‌المللی",
  },
  {
    id: "2809513713",
    title: "پاپ بین‌المللی",
    blurb: "جدول آهنگ‌های محبوب غربی",
    emoji: "🌍",
    group: "بین‌المللی",
  },
  {
    id: "2900343697",
    title: "موسیقی فیلم",
    blurb: "ترانه‌ها و قطعه‌های محبوب از دنیای سینما",
    emoji: "🎬",
    group: "سبک",
  },
  {
    id: "2860790063",
    title: "صدای مستقل",
    blurb: "مجموعه‌ای از هنرمندان مستقل",
    emoji: "🌙",
    group: "حال‌وهوا",
  },
];
