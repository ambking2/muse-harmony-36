/**
 * Provider-backed collections. Each ID points to a public NetEase playlist
 * or chart; the detail route fetches its real tracks from the music service.
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
    blurb: "مجموعه‌ای از پاپ و پاپ‌راک فارسی",
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
    title: "موسیقی اورجینال",
    blurb: "جدول آثار اورجینال و مستقل",
    emoji: "🎙️",
  },
  {
    id: "991319590",
    title: "رپ و هیپ‌هاپ",
    blurb: "جدول موسیقی رپ نت‌ایز",
    emoji: "🎤",
  },
  {
    id: "1978921795",
    title: "الکترونیک و دنس",
    blurb: "جدول موسیقی الکترونیک پرانرژی",
    emoji: "🪩",
  },
  {
    id: "71384707",
    title: "موسیقی کلاسیک",
    blurb: "جدول قطعه‌های موسیقی کلاسیک",
    emoji: "🎻",
  },
  {
    id: "71385702",
    title: "انیمه و بازی",
    blurb: "موسیقی مرتبط با انیمه و بازی‌های ویدیویی",
    emoji: "🎮",
  },
  {
    id: "745956260",
    title: "موسیقی کره‌ای",
    blurb: "جدول موسیقی کره‌ای",
    emoji: "🇰🇷",
  },
  {
    id: "2809513713",
    title: "پاپ بین‌المللی",
    blurb: "جدول آهنگ‌های محبوب غربی",
    emoji: "🌍",
  },
  {
    id: "2900343697",
    title: "موسیقی فیلم",
    blurb: "ترانه‌ها و قطعه‌های محبوب از دنیای سینما",
    emoji: "🎬",
  },
  {
    id: "2860790063",
    title: "صدای مستقل",
    blurb: "مجموعه‌ای از هنرمندان مستقل",
    emoji: "🌙",
  },
];
