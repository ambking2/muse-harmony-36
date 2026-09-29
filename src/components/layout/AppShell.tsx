import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { DockNav } from "./Dock";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard";
import { useArtworkAccent } from "@/hooks/use-artwork-accent";
import { paletteRegistry, queueRegistry } from "@/lib/ui-control";
import type { OpenerRegistry } from "@/lib/ui-control";
import { cn } from "@/lib/utils";

const QueueSheet = lazy(() =>
  import("../player/QueueSheet").then((m) => ({ default: m.QueueSheet })),
);
const CommandPalette = lazy(() =>
  import("../CommandPalette").then((m) => ({ default: m.CommandPalette })),
);

/** Pages that own their own large title — the shell skips its page chrome for them. */
const STANDALONE = new Set(["/now-playing"]);

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  // Tints the whole app with the current artwork colour.
  useArtworkAccent();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStandalone = STANDALONE.has(pathname);

  // Move the page to the top on navigation (single-page app behaviour).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    // `overflow-x-clip` stops any single wide child (a long title, a bleeded
    // rail) from turning into a page-wide horizontal scrollbar, while rails
    // that really do scroll keep their own `overflow-x-auto`.
    <div className="ambient relative min-h-screen overflow-x-clip text-foreground">
      <DeferredOverlay registry={paletteRegistry} load={COMMAND_PALETTE_CHUNK}>
        <CommandPalette />
      </DeferredOverlay>
      <DeferredOverlay registry={queueRegistry} load={QUEUE_SHEET_CHUNK}>
        <QueueSheet />
      </DeferredOverlay>

      <main className={cn("mx-auto max-w-6xl px-4 pb-44 pt-6 sm:px-6", isStandalone && "pb-40")}>
        {children}
      </main>

      <DockNav />
      <Toaster position="top-center" theme="dark" richColors closeButton />
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

/** Section header used across the app's library-style pages. */
export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}

/** Back link for the deep pages (artist/album/playlist). */
export function BackLink({ to = "/explore" }: { to?: string }) {
  return (
    <Link
      to={to}
      className="glass mb-4 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      بازگشت
    </Link>
  );
}
