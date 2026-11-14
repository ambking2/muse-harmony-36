/**
 * Everything editable on the home page lives here: copy, labels, accent
 * colours, reduced-motion text and the asset manifest. No component hard-codes
 * a phrase or a media URL.
 */

export type AssetKind = "procedural" | "image" | "video";

export type HomeAsset = {
  kind: AssetKind;
  /** Put a file from /public (or an imported asset URL) here to replace the
   *  procedural CSS-3D object. `null` keeps the built-in crystals and ring. */
  src: string | null;
  poster: string | null;
  alt: string;
};

/**
 * Stable asset slots. Today every slot is procedural (pure CSS 3D). To use
 * authored footage, set `kind` to "video" or "image" and fill `src`:
 * a video is scrubbed by scroll position; if it fails to load, the procedural
 * scene is shown instead.
 */
export const HOME_ASSETS: Record<
  "hero-scene" | "chapter-scene" | "ending-scene",
  HomeAsset
> = {
  "hero-scene": {
    kind: "procedural",
    src: null,
    poster: null,
    alt: "دو کریستال شیشه‌ای و یک حلقهٔ معلق که با اسکرول می‌چرخند و از هم باز و جمع می‌شوند.",
  },
  "chapter-scene": { kind: "procedural", src: null, poster: null, alt: "" },
  "ending-scene": { kind: "procedural", src: null, poster: null, alt: "" },
};

export const HOME_CONFIG = {
  brand: "muis",
  kicker: "MUSE HARMONY · YOUR SOUNDSPACE",
  badge: "SOUNDSPACE",

  title: {
    line1: ["موسیقی،"],
    line2: ["در", "جریان."],
  },

  nav: {
    overview: "نمای کلی",
    account: "حساب",
    scroll: "اسکرول کن",
    top: "بازگشت به بالا",
    railLabel: "بخش‌های صفحه اصلی",
  },

  overview: { en: "OVERVIEW", title: "نمای کلی" },

  chapters: {
    resume: { en: "CONTINUE", title: "ادامه‌ی پخش" },
    recent: { en: "RECENT", title: "پخش‌های اخیر" },
    favorites: { en: "FAVORITES", title: "علاقه‌مندی‌ها" },
    playlists: { en: "PLAYLISTS", title: "پلی‌لیست‌ها" },
    library: { en: "LIBRARY", title: "کتابخانه" },
  },

  units: { songs: "آهنگ", playlists: "پلی‌لیست" },

  ending: {
    title: "از همین‌جا ادامه بده.",
  },

  /** Shown only when the device asks for reduced motion. */
  reducedMotionNote: "حرکت‌ها طبق تنظیم دستگاه شما خاموش است؛ صحنه ثابت نمایش داده می‌شود.",

  accents: {
    lime: "#c7ff32",
    lavender: "hsl(255 70% 93%)",
    lavenderDark: "hsl(255 28% 25%)",
  },
} as const;
