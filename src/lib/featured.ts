/**
 * Real, human-curated Iranian collections from the provider's own catalogue.
 *
 * Search can only return what matches a query string, and this app's whole
 * point is Iranian music — which the providers index under Latin names, so
 * search alone reliably finds the artist but never the surrounding collection.
 * The playlist endpoint is the one place that returns hand-picked lists.
 *
 * Every id here has been checked against the live endpoint; ids that return a
 * truncated or reshaped payload are left out rather than shipped broken.
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
    title: "پاپ و پاپ‌-rock فارسی",
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
    blurb: "فرشید بزرگی، جلیل شهناز و الفا شریعتی — بی‌کلام ایرانی",
    emoji: "🎼",
  },
];
