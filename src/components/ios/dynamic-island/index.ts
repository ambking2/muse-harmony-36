/**
 * Dynamic Island notifications.
 *
 * A web port of github.com/rit3zh/expo-dynamic-notifications: the island at the
 * top of the screen grows a droplet out of its underside, the droplet falls
 * with a neck stretching behind it, then swells into the notification card
 * while its colour travels from the island's black to the card's white.
 *
 * Wrap the app once, then raise a notification from anywhere beneath it:
 *
 *   const { trigger } = useDynamicNotifications();
 *   trigger({ title: "Done", message: "Saved to your library" });
 */
export { DynamicNotifications, IslandNotificationBody } from "./DynamicNotifications";
export { useDynamicNotifications } from "./context";
export type { DynamicNotificationsValue } from "./context";
export type { IslandNotification } from "./types";
export { NowPlayingIsland } from "./NowPlayingIsland";
export { getNotificationLayout, buildNotificationGeometry, neckProfile } from "./geometry";
