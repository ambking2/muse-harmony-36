/**
 * Real provider-backed collections. Each card points at a public NetEase
 * playlist ID, so the detail page loads the provider's actual track list.
 * Avoid search-query cards here: a playlist must open with real tracks.
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
    blurb: "سیروان خسروی، میلاد بابایی و دیگر پاپ‌های محبوب",
    emoji: "🎧",
  },
  {
    id: "877430953",
    title: "گلوله‌های پاپ",
    blurb: "احمد solo، حمید ناظریان و مجموعه‌ای از صداهای معاصر",
    emoji: "💿",
  },
  {
    id: "7223191024",
    title: "موسیقی سنتی ایران",
    blurb: "رضا شجاعی، حسین علیزاده و مقام‌های کلاسیک",
    emoji: "🪕",
  },
  {
    id: "4895623116",
    title: "عود و نی",
    blurb: "فرشید بزرگی، جلیل شهناز و موسیقی بی‌کلام ایرانی",
    emoji: "🎼",
  },
  {
    id: "3778678",
    title: "ترانه‌های پرطرفدار",
    blurb: "فهرست آهنگ‌های محبوب و پرشنونده",
    emoji: "🔥",
  },
  {
    id: "991319590",
    title: "رپ و هیپ‌هاپ",
    blurb: "انتخاب‌هایی از موسیقی رپ",
    emoji: "🎤",
  },
  {
    id: "1978921795",
    title: "الکترونیک و رقص",
    blurb: "ریتم‌های الکترونیک برای بالا بردن انرژی",
    emoji: "🪩",
  },
  {
    id: "71384707",
    title: "موسیقی کلاسیک",
    blurb: "قطعه‌های کلاسیک برای گوش دادن با تمرکز",
    emoji: "🎻",
  },
  {
    id: "745956260",
    title: "موسیقی کره‌ای",
    blurb: "ترانه‌های منتخب از موسیقی کره",
    emoji: "🇰🇷",
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
  {
    id: "2809513713",
    title: "پاپ بین‌المللی",
    blurb: "آهنگ‌های پاپ محبوب از هنرمندان جهان",
    emoji: "🌍",
  },
];
