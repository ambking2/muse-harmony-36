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
    blurb: "مجموعه‌ای از پاپ و پاپ‌راک",
    emoji: "🎧",
    group: "ایرانی"
  },
  {
    id: "877430953",
    title: "گلچین پاپ",
    blurb: "ترانه‌های پاپ منتخب",
    emoji: "💿",
    group: "ایرانی"
  },
  {
    id: "7223191024",
    title: "موسیقی سنتی ایران",
    blurb: "موسیقی سنتی و سازهای ایرانی",
    emoji: "🪕",
    group: "ایرانی"
  },
  {
    id: "4895623116",
    title: "عود و نی",
    blurb: "موسیقی سازی و بی‌کلام",
    emoji: "🎼",
    group: "ایرانی"
  },
  {
    id: "2829883282",
    title: "پاپ چینی",
    blurb: "منتخب موسیقی پاپ چینی",
    emoji: "🌏",
    group: "بین‌المللی"
  },
  {
    id: "2829816518",
    title: "پاپ غربی",
    blurb: "موسیقی پاپ بین‌المللی",
    emoji: "🌍",
    group: "بین‌المللی"
  },
  {
    id: "2829896389",
    title: "پاپ ژاپنی",
    blurb: "ترانه‌های پاپ ژاپنی",
    emoji: "🇯🇵",
    group: "بین‌المللی"
  },
  {
    id: "991319590",
    title: "رپ و هیپ‌هاپ",
    blurb: "مجموعه‌ای از قطعه‌های رپ",
    emoji: "🎤",
    group: "سبک"
  },
  {
    id: "1978921795",
    title: "الکترونیک و دنس",
    blurb: "ریتم‌های الکترونیک پرانرژی",
    emoji: "🪩",
    group: "سبک"
  },
  {
    id: "5059633707",
    title: "راک",
    blurb: "منتخب موسیقی راک",
    emoji: "🎸",
    group: "سبک"
  },
  {
    id: "71384707",
    title: "موسیقی کلاسیک",
    blurb: "قطعه‌های کلاسیک و ارکسترال",
    emoji: "🎻",
    group: "حال‌وهوا"
  },
  {
    id: "2900343697",
    title: "موسیقی فیلم و سریال",
    blurb: "ترانه‌های برگزیده از آثار تصویری",
    emoji: "🎬",
    group: "سبک"
  },
  {
    id: "2829821753",
    title: "تمرکز و مطالعه",
    blurb: "موسیقی پس‌زمینه برای کار و مطالعه",
    emoji: "📚",
    group: "حال‌وهوا"
  },
  {
    id: "3778678",
    title: "ترانه‌های پرطرفدار",
    blurb: "فهرست محبوب‌های سرویس موسیقی",
    emoji: "🔥",
    group: "بین‌المللی"
  },
  {
    id: "3779629",
    title: "تازه‌های موسیقی",
    blurb: "آهنگ‌های تازه در فهرست جدیدترین‌ها",
    emoji: "✨",
    group: "بین‌المللی"
  },
  {
    id: "19723756",
    title: "آهنگ‌های رو به رشد",
    blurb: "ترانه‌هایی که در جدول صعود می‌کنند",
    emoji: "📈",
    group: "بین‌المللی"
  },
  {
    id: "2364959460",
    title: "عاشقانه",
    blurb: "ترانه‌هایی با حال‌وهوای عاشقانه",
    emoji: "❤️",
    group: "حال‌وهوا"
  },
  {
    id: "799068322",
    title: "موسیقی برای خواب",
    blurb: "قطعه‌های آرام برای پایان روز",
    emoji: "🌙",
    group: "حال‌وهوا"
  },
  {
    id: "2829839197",
    title: "شب و نیمه‌شب",
    blurb: "موسیقی برای ساعت‌های خلوت شب",
    emoji: "🌃",
    group: "حال‌وهوا"
  },
  {
    id: "2829895462",
    title: "جاز و بلوز",
    blurb: "منتخب قطعه‌های جاز",
    emoji: "🎷",
    group: "سبک"
  },
  {
    id: "2888212971",
    title: "موسیقی رقص و دی‌جی",
    blurb: "مجموعه‌ای از قطعه‌های دی‌جی و رقص",
    emoji: "🎛️",
    group: "موقعیت"
  },
  {
    id: "2829864004",
    title: "کشف آهنگ‌های تازه",
    blurb: "فهرستی برای پیدا کردن موسیقی جدید",
    emoji: "✨",
    group: "بین‌المللی"
  },
];
