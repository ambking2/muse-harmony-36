import { lazy, Suspense, type ReactNode } from "react";
import type { Track } from "@/lib/types";

/**
 * The row menu drags in the whole dropdown-menu tree plus the download and share
 * modules. Every track row renders one, but a list of thirty tracks opens at
 * most one — so the menu is only pulled in once the user asks for it, and the
 * trigger button renders immediately so the click never lands on a dead target.
 */
const TrackMenu = lazy(() => import("./TrackMenu").then((m) => ({ default: m.TrackMenu })));

export function TrackMenuLazy({ track, children }: { track: Track; children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <TrackMenu track={track}>{children}</TrackMenu>
    </Suspense>
  );
}
