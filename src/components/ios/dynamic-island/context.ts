import { createContext, useContext } from "react";
import type { MotionValue } from "framer-motion";

import type { IslandNotification } from "./types";
import type { NotificationLayout } from "./geometry";

/**
 * What a notification can be told to draw, and how far along it is.
 *
 * `drop`, `expand`, `reveal` and `tint` are the same four drivers the original
 * exposes: the fall out of the island, the morph into the card, the content's
 * reveal, and the droplet's colour travel from black to white. `dragY` is the
 * finger. They are readable by anything inside the provider that wants to move
 * with the notification rather than beside it.
 */
export interface DynamicNotificationsValue {
  trigger: (notification: IslandNotification) => void;
  dismiss: () => void;
  isVisible: boolean;
  notification: IslandNotification | null;
  layout: NotificationLayout;
  drop: MotionValue<number>;
  expand: MotionValue<number>;
  reveal: MotionValue<number>;
  tint: MotionValue<number>;
  dragY: MotionValue<number>;
  /** The container's accent, before any per-notification override. */
  accent: string;
  /** The resolved goo radius, in pixels. */
  blur: number;
}

export const DynamicNotificationsContext = createContext<DynamicNotificationsValue | null>(null);

/**
 * The notification API, for everything beneath `<DynamicNotifications>`.
 *
 * `trigger` shows one (replacing one that is already up, which is queued until
 * the first has left); `dismiss` closes it early.
 */
export function useDynamicNotifications(): DynamicNotificationsValue {
  const value = useContext(DynamicNotificationsContext);
  if (!value) {
    throw new Error("useDynamicNotifications must be used inside <DynamicNotifications>");
  }
  return value;
}
