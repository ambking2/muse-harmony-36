/**
 * Public NetEase playlist IDs used by the provider playlist endpoint.
 * Cards open provider playlists; their tracks are fetched live, not generated
 * from search results.
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
  { id: "168971630", title: "پاپ و پاپ‌راک فارسی", blurb: "مجموعه‌ای از پاپ و پاپ‌راک", emoji: "🎧", group: "ایرانی" },
  { id: "877430953", title: "گلچین پاپ", blurb: "ترانه‌های پاپ منتخب", emoji: "💿", group: "ایرانی" },
  { id: "7223191024", title: "موسیقی سنتی ایران", blurb: "موسیقی سنتی و سازهای ایرانی", emoji: "🪕", group: "ایرانی" },
  { id: "4895623116", title: "عود و نی", blurb: "موسیقی سازی و بی‌کلام", emoji: "🎼", group: "ایرانی" },
  { id: "3778678", title: "ترانه‌های پرطرفدار", blurb: "فهرست محبوب‌های سرویس موسیقی", emoji: "🔥", group: "بین‌المللی" },
  { id: "3779629", title: "تازه‌های موسیقی", blurb: "آهنگ‌های تازه در فهرست جدیدترین‌ها", emoji: "✨", group: "بین‌المللی" },
  { id: "19723756", title: "آهنگ‌های رو به رشد", blurb: "ترانه‌هایی که در جدول صعود می‌کنند", emoji: "📈", group: "بین‌المللی" },
  { id: "2884035", title: "موسیقی مستقل و اورجینال", blurb: "فهرست آثار اورجینال", emoji: "🎙️", group: "سبک" },
  { id: "10520166", title: "موسیقی الکترونیک", blurb: "منتخب موسیقی الکترونیک", emoji: "🪩", group: "سبک" },
  { id: "71385702", title: "موسیقی انیمه و بازی", blurb: "موسیقی انیمه، بازی و آثار تصویری", emoji: "🎮", group: "سبک" },
  { id: "991319590", title: "رپ و هیپ‌هاپ", blurb: "موسیقی رپ و هیپ‌هاپ", emoji: "🎤", group: "سبک" },
  { id: "123033556", title: "موسیقی متن و سینمایی", blurb: "موسیقی برای فیلم و سریال", emoji: "🎬", group: "سبک" },
  { id: "2023401535", title: "موسیقی آرام و شبانه", blurb: "انتخابی برای شب و استراحت", emoji: "🌙", group: "حال‌وهوا" },
  { id: "2250011882", title: "الکترونیک و دنس", blurb: "ریتم‌های الکترونیک و مناسب مهمانی", emoji: "🪩", group: "موقعیت" },
  { id: "2809513713", title: "پاپ و هیت‌های غربی", blurb: "ترانه‌های محبوب پاپ بین‌المللی", emoji: "🌍", group: "بین‌المللی" },
  { id: "2617766278", title: "موسیقی انیمه", blurb: "قطعه‌های موسیقی انیمه و آثار ژاپنی", emoji: "🎌", group: "سبک" },
  { id: "5051609", title: "راک", blurb: "مجموعه‌ای از موسیقی راک", emoji: "🎸", group: "سبک" },
  { id: "71384707", title: "موسیقی کلاسیک", blurb: "قطعه‌های کلاسیک برای شنیدن با تمرکز", emoji: "🎻", group: "حال‌وهوا" },
  { id: "2829779628", title: "موسیقی برای ورزش", blurb: "ریتم‌های پرانرژی برای تمرین و فعالیت", emoji: "💪", group: "موقعیت" },
  { id: "2945028696", title: "نوستالژی و آهنگ‌های قدیمی", blurb: "ترانه‌هایی با حال‌وهوای خاطره‌انگیز", emoji: "📻", group: "حال‌وهوا" },
  { id: "2920647537", title: "عاشقانه‌های آرام", blurb: "ترانه‌های ملایم برای لحظه‌های آرام", emoji: "❤️", group: "حال‌وهوا" },
  { id: "2829807251", title: "موسیقی جاده و سفر", blurb: "همراهی موسیقی برای مسیرهای طولانی", emoji: "🚘", group: "موقعیت" },
  { id: "2888212971", title: "میکس دی‌جی", blurb: "انتخابی از موسیقی دی‌جی و ریتم‌های رقص", emoji: "🎛️", group: "موقعیت" },
];
