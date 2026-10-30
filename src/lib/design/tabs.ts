import { House, LibraryBig, Search, UserRound, type LucideIcon } from "lucide-react";

/**
 * The app's destinations.
 *
 * The dock carries three of them — home, library and the account — and search
 * rides beside the dock as its own circular button, the way a camera sits
 * beside the mode tabs. The player is not a dock item: it is a full-screen
 * surface the mini player already opens, and favourites, downloads and
 * settings live where the content is — the home screen's shortcut list.
 *
 * Modelled as an enum rather than loose strings because the dock, the keyboard
 * shortcuts and the "which screen am I on?" check all need to agree on one
 * vocabulary — a typo in a path string should not silently leave the dock
 * unhighlighted.
 */
export enum Tab {
  Home = "home",
  Search = "search",
  Library = "library",
  Account = "account",
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

/** The three items inside the floating dock, in RTL reading order. */
export const DOCK_ITEMS: readonly TabItem[] = [
  { tab: Tab.Home, to: "/", label: "خانه", icon: House },
  { tab: Tab.Library, to: "/library", label: "کتابخانه", icon: LibraryBig },
  { tab: Tab.Account, to: "/profile", label: "پروفایل", icon: UserRound },
] as const;

/** Search, the circular button beside the dock. */
export const SEARCH_ITEM: TabItem = {
  tab: Tab.Search,
  to: "/explore",
  label: "جستجو",
  icon: Search,
};

/**
 * Which tab a path belongs to.
 *
 * A detail screen pushed on top of a tab (an artist, an album, a playlist)
 * keeps its parent tab lit, the way iOS keeps the tab you came from
 * highlighted on a pushed screen. Screens reached from the home shortcut list
 * (favourites, downloads, settings) keep home lit. The player is full screen
 * and has no dock at all, so it returns null there.
 */
const DETAIL_PARENTS: readonly (readonly [string, Tab])[] = [
  // Found through search, so they carry the search light while pushed.
  ["/artist/", Tab.Search],
  ["/album/", Tab.Search],
  ["/t/", Tab.Search],
  ["/p/", Tab.Search],
  // Playlists and mixes live in the library.
  ["/playlist/", Tab.Library],
  ["/mix/", Tab.Library],
  ["/downloads", Tab.Library],
  ["/favorites", Tab.Library],
  ["/settings", Tab.Account],
  ["/account", Tab.Account],
];

export function tabForPath(pathname: string): Tab | null {
  for (const item of DOCK_ITEMS) {
    if (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)) {
      return item.tab;
    }
  }
  for (const [prefix, tab] of DETAIL_PARENTS) {
    if (pathname.startsWith(prefix)) return tab;
  }
  return null;
}
