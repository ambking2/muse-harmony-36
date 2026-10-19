import type { ReactNode } from "react";

/**
 * One notification.
 *
 * Mirrors the object `expo-dynamic-notifications` takes, with three changes
 * that the web forces:
 *
 *   - `avatar` may be a promise. Cover art in this app is fetched through a
 *     server proxy, so it is never ready at the moment a track starts.
 *   - `symbol` is a node rather than an SF Symbol name; there is no system
 *     symbol library here, and the app already draws with lucide.
 *   - no per-platform variants, because there is one platform.
 */
export interface IslandNotification {
  /** The bold first line, tinted with the accent. Required. */
  title: string;
  /** The second line. */
  message?: string;
  /** Artwork for the leading circle, or a promise of one. */
  avatar?: string | Promise<string | null | undefined> | null;
  /** A glyph for the trailing side — pass an icon element. */
  symbol?: ReactNode;
  /** Per-notification tint. Overrides the container's accent. */
  accent?: string;
  /** Per-notification lifetime. `null` keeps it up until dismissed. */
  duration?: number | null;
  /** Runs on tap, then the notification dismisses. */
  onPress?: () => void;
  /** Replaces the default body. The card, the morph and the gesture stay. */
  render?: (notification: IslandNotification) => ReactNode;
  /** Your identifier, handed back through `onDismiss`. */
  id?: string;
}
