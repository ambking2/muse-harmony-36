import type { ReactNode } from "react";
import { Suspense, lazy, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { MiniPlayer } from "@/components/ios/MiniPlayer";
import { TabBar } from "@/components/ios/TabBar";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard";
import { useArtworkAccent } from "@/hooks/use-artwork-accent";
import { usePointerLight } from "@/hooks/use-pointer-light";
import { page } from "@/lib/design/motion";
import { cn } from "@/lib/utils";
import { armMotion } from "@/lib/design/motion-gsap";
import { paletteRegistry, queueRegistry } from "@/lib/ui-control";
import type { OpenerRegistry } from "@/lib/ui-control";

const QueueSheet = lazy(() =>
  import("../player/QueueSheet").then((m) => ({ default: m.QueueSheet })),
);
const CommandPalette = lazy(() =>
  import("../CommandPalette").then((m) => ({ default: m.CommandPalette })),
);

/** Full-screen routes that own the whole viewport, so no tab bar over them. */
const STANDALONE = new Set(["/now-playing"]);

/**
 * The app's frame: overlays, the page, and the two pieces of chrome that sit
 * over it.
 *
 * Pages bring their own title bar (`Screen`); the shell only owns the parts
 * that must survive navigation — the tab bar, the mini player and the deferred
 * sheets. Bottom padding comes from a CSS token sized to that chrome, so the
 * two can never drift apart the way a hard-coded `pb-44` did.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  // Tints the whole app with the current artwork colour.
  useArtworkAccent();
  // Publishes the pointer position so the chrome's highlights can track it.
  usePointerLight();
  // Rapport's boot contract: hover motion (lift, magnetic) waits until the
  // entrance has finished, so a resting pointer never fights the arrival.
  useEffect(() => armMotion(), []);

  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isStandalone = STANDALONE.has(pathname);

  // Move the page to the top on navigation (single-page app behaviour).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    // `overflow-x-clip` stops any single wide child (a long title, a bleeded
    // rail) from turning into a page-wide horizontal scrollbar, while rails
    // that really do scroll keep their own `overflow-x-auto`.
    <div className={cn("ambient relative overflow-x-clip text-foreground", isStandalone ? "h-dvh overflow-y-hidden" : "min-h-screen")}>
      {/* The living background, then the smeared cover on top of it. Together
          they are the scene every glass surface refracts. Decorative only — the
          artwork is already announced by the player. */}
      <div className="mesh" aria-hidden />
      <div className="mesh-accent" aria-hidden />
      <div className="ambient-art" aria-hidden />

      <DeferredOverlay registry={paletteRegistry} load={COMMAND_PALETTE_CHUNK}>
        <CommandPalette />
      </DeferredOverlay>
      <DeferredOverlay registry={queueRegistry} load={QUEUE_SHEET_CHUNK}>
        <QueueSheet />
      </DeferredOverlay>

      <main className={isStandalone ? "h-full overflow-hidden pb-0" : "pb-[calc(var(--chrome-inset)+1.5rem)]"}>
        {/* The page transition. Keyed on the path, so navigating replays a
            short enter instead of swapping the whole surface at once — eight
            pixels of travel and a fifth of a second, which reads as turning a
            page rather than as the app thinking. Only `transform` and `opacity`
            move, so it never costs a layout pass, and it never delays the
            route: the new screen is mounted immediately and arrives. */}
        <motion.div className={isStandalone ? "h-full" : undefined} key={pathname} initial="hidden" animate="visible" variants={page}>
          {children}
        </motion.div>
      </main>

      {/* The dock lives on every screen, the player included — the full player
          is a page, not a mode. The mini player keeps its distance there: the
          same track twice on one screen is noise, not navigation. */}
      {!isStandalone && <MiniPlayer />}
      <TabBar />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

/**
 * The command palette and the queue sheet are large — between them they drag in
 * the dialog, drawer and animation libraries — and neither shows anything until
 * the user asks for it. So their chunks are fetched during idle time rather
 * than on the critical path, while the opener registers immediately so a click
 * or a shortcut never lands on a dead button.
 */
function DeferredOverlay({
  registry,
  load,
  children,
}: {
  registry: OpenerRegistry;
  load: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => registry.register({ open: () => setReady(true) }), [registry]);

  useEffect(() => {
    const idle =
      "requestIdleCallback" in window
        ? requestIdleCallback(() => void load())
        : setTimeout(() => void load(), 2000);
    return () => {
      if (typeof idle === "number") window.clearTimeout(idle);
    };
  }, [load]);

  if (!ready) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

const COMMAND_PALETTE_CHUNK = () => import("../CommandPalette");
const QUEUE_SHEET_CHUNK = () => import("../player/QueueSheet");
