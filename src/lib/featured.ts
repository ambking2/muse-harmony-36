/**
 * Provider-backed collections. Each card opens a NetEase playlist/chart ID;
 * the detail page fetches its track list from the provider, never from search.
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
  { id: "168971630", title: "پاپ و پاپ‌راک فارسی", blurb: "مجموعه‌ای از پاپ و پاپ‌راک فارسی", emoji: "🎧", group: "ایرانی" },
  { id: "877430953", title: "گلچین پاپ", blurb: "ترانه‌های پاپ منتخب", emoji: "💿", group: "ایرانی" },
  { id: "7223191024", title: "موسیقی سنتی ایران", blurb: "موسیقی سنتی و سازهای ایرانی", emoji: "🪕", group: "ایرانی" },
  { id: "4895623116", title: "عود و نی", blurb: "موسیقی سازی و بی‌کلام", emoji: "🎼", group: "ایرانی" },
  { id: "3778678", title: "ترانه‌های پرطرفدار", blurb: "جدول آهنگ‌های محبوب نت‌ایز", emoji: "🔥", group: "بین‌المللی" },
  { id: "3779629", title: "تازه‌های موسیقی", blurb: "جدول آهنگ‌های تازه منتشرشده", emoji: "✨", group: "بین‌المللی" },
  { id: "19723756", title: "آهنگ‌های در حال اوج", blurb: "جدول آهنگ‌هایی که محبوبیتشان رو به افزایش است", emoji: "📈", group: "بین‌المللی" },
  { id: "2884035", title: "موسیقی اورجینال", blurb: "جدول آثار اورجینال و مستقل", emoji: "🎙️", group: "سبک" },
  { id: "991319590", title: "رپ و هیپ‌هاپ", blurb: "جدول موسیقی رپ نت‌ایز", emoji: "🎤", group: "سبک" },
  { id: "1978921795", title: "الکترونیک و دنس", blurb: "جدول موسیقی الکترونیک پرانرژی", emoji: "🪩", group: "موقعیت" },
  { id: "71384707", title: "موسیقی کلاسیک", blurb: "قطعه‌های کلاسیک و ارکسترال", emoji: "🎻", group: "حال‌وهوا" },
  { id: "71385702", title: "انیمه و بازی", blurb: "موسیقی مرتبط با انیمه و بازی‌های ویدیویی", emoji: "🎮", group: "سبک" },
  { id: "745956260", title: "موسیقی کره‌ای", blurb: "منتخب موسیقی کره‌ای", emoji: "🇰🇷", group: "بین‌المللی" },
  { id: "2809513713", title: "پاپ بین‌المللی", blurb: "جدول آهنگ‌های محبوب غربی", emoji: "🌍", group: "بین‌المللی" },
  { id: "2900343697", title: "موسیقی فیلم", blurb: "ترانه‌ها و قطعه‌های محبوب از دنیای سینما", emoji: "🎬", group: "سبک" },
  { id: "2860790063", title: "صدای مستقل", blurb: "مجموعه‌ای از هنرمندان مستقل", emoji: "🌙", group: "سبک" },
  { id: "2829883282", title: "پاپ چینی", blurb: "منتخب موسیقی پاپ چینی", emoji: "🌏", group: "بین‌المللی" },
  { id: "2829896389", title: "پاپ ژاپنی", blurb: "ترانه‌های پاپ ژاپنی", emoji: "🇯🇵", group: "بین‌المللی" },
  { id: "2364959460", title: "عاشقانه", blurb: "ترانه‌هایی با حال‌وهوای عاشقانه", emoji: "❤️", group: "حال‌وهوا" },
  { id: "799068322", title: "موسیقی برای خواب", blurb: "قطعه‌های آرام برای پایان روز", emoji: "💤", group: "حال‌وهوا" },
  { id: "2829839197", title: "شب و نیمه‌شب", blurb: "موسیقی برای ساعت‌های خلوت شب", emoji: "🌃", group: "حال‌وهوا" },
  { id: "2829895462", title: "جاز و بلوز", blurb: "منتخب قطعه‌های جاز", emoji: "🎷", group: "سبک" },
  { id: "2888212971", title: "موسیقی رقص و دی‌جی", blurb: "مجموعه‌ای از قطعه‌های دی‌جی و رقص", emoji: "🎛️", group: "موقعیت" },
];
