import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Search, Command as CommandIcon, Download, ListMusic } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "../player/MiniPlayer";
import { QueueSheet } from "../player/QueueSheet";
import { CommandPalette } from "../CommandPalette";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard";
import { useArtworkAccent } from "@/hooks/use-artwork-accent";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { paletteRegistry, queueRegistry } from "@/lib/ui-control";
import { cn } from "@/lib/utils";

/** Pages that own their own large title — the shell skips its header for them. */
const STANDALONE = new Set(["/now-playing"]);

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  // Tints the whole app with the current artwork colour.
  useArtworkAccent();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStandalone = STANDALONE.has(pathname);
  const downloads = useLibrary((s) => s.downloads);
  const queue = usePlayer((s) => s.queue);

  // Move the page to the top on navigation (single-page app behaviour).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="ambient relative min-h-screen text-foreground">
      {!isStandalone && <TopBar downloadCount={downloads.length} queueCount={queue.length} />}

      <CommandPalette />
      <QueueSheet />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "mx-auto max-w-6xl px-4 pb-56 pt-4 sm:px-6 md:pb-40",
            isStandalone && "pb-40",
          )}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <MiniPlayer />
      <BottomNav />
      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}

function TopBar({ downloadCount, queueCount }: { downloadCount: number; queueCount: number }) {
  return (
    <header className="sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-black tracking-tight"
          aria-label="muis"
        >
          <span
            className="grid size-8 place-items-center rounded-xl text-sm text-white shadow-lg"
            style={{ background: "var(--track-accent)" }}
          >
            ♪
          </span>
          <span className="hidden sm:inline">muis</span>
        </Link>

        <div className="flex-1" />

        <button
          onClick={() => paletteRegistry.openAll()}
          className="glass flex h-10 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition hover:text-foreground sm:w-64"
          aria-label="جستجو"
        >
          <Search className="size-4" />
          <span className="hidden flex-1 text-right sm:inline">جستجوی آهنگ، خواننده…</span>
          <kbd className="glass hidden items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] sm:flex">
            <CommandIcon className="size-2.5" />K
          </kbd>
        </button>

        <Link
          to="/downloads"
          className="glass relative hidden size-10 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground sm:flex"
          aria-label="دانلودها"
        >
          <Download className="size-4" />
          {downloadCount > 0 && <Badge>{downloadCount}</Badge>}
        </Link>

        <button
          onClick={() => queueRegistry.openAll()}
          className="glass relative flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
          aria-label="صف پخش"
        >
          <ListMusic className="size-4" />
          {queueCount > 0 && <Badge>{queueCount}</Badge>}
        </button>
      </div>
      <div className="h-px bg-gradient-to-l from-transparent via-white/10 to-transparent" />
    </header>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="absolute -top-0.5 -left-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
      {children}
    </span>
  );
}

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
export function BackLink() {
  return (
    <Link
      to="/explore"
      className="glass mb-4 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
    >
      <ChevronRight className="size-4 rotate-180" />
      بازگشت
    </Link>
  );
}
