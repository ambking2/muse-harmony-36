import { Heart, Home, Library, Search, UserRound, type LucideIcon } from "lucide-react";

/**
 * The app's five top-level destinations.
 *
 * Modelled as an enum rather than loose strings because the tab bar, the
 * keyboard shortcuts and the "which screen am I on?" check all need to agree on
 * one vocabulary — a typo in a path string should not silently leave the tab
 * bar unhighlighted.
 */
export enum Tab {
  Home = "home",
  Search = "search",
  Library = "library",
  Favorites = "favorites",
  Profile = "profile",
}

export interface TabItem {
  tab: Tab;
  /** Route this tab opens. */
  to: string;
  /** Label under the icon. */
  label: string;
  icon: LucideIcon;
}

/** Order matters — it is the left-to-right order of the bar, and the app is
 *  RTL, so this reads right-to-left on screen. */
export const TAB_ITEMS: readonly TabItem[] = [
  { tab: Tab.Home, to: "/", label: "خانه", icon: Home },
  { tab: Tab.Search, to: "/explore", label: "جستجو", icon: Search },
  { tab: Tab.Library, to: "/library", label: "کتابخانه", icon: Library },
  { tab: Tab.Favorites, to: "/favorites", label: "علاقه‌مندی", icon: Heart },
  { tab: Tab.Profile, to: "/profile", label: "پروفایل", icon: UserRound },
] as const;

/**
 * Which tab a path belongs to.
 *
 * A detail screen pushed on top of a tab (an artist, an album, a playlist)
 * keeps its parent tab lit, the way iOS keeps the tab you came from highlighted
 * on a pushed screen. `/now-playing` is full screen and has no tab bar at all,
 * so it returns null.
 */
const DETAIL_PARENTS: readonly (readonly [string, Tab])[] = [
  // Found through search, so they belong to the search tab.
  ["/artist/", Tab.Search],
  ["/album/", Tab.Search],
  ["/t/", Tab.Search],
  ["/p/", Tab.Search],
  // Playlists and mixes live in the library.
  ["/playlist/", Tab.Library],
  ["/mix/", Tab.Library],
  ["/downloads", Tab.Library],
  ["/settings", Tab.Profile],
  ["/account", Tab.Profile],
];

export function tabForPath(pathname: string): Tab | null {
  for (const item of TAB_ITEMS) {
    if (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)) return item.tab;
  }
  for (const [prefix, tab] of DETAIL_PARENTS) {
    if (pathname.startsWith(prefix)) return tab;
  }
  return null;
}
