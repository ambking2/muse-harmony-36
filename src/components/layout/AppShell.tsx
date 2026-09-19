import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "../player/MiniPlayer";
import { CommandPalette } from "../CommandPalette";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh text-foreground">
      <div className="app-ambient" aria-hidden="true" />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <CommandPalette />
      <main id="main-content" tabIndex={-1} className="app-content">
        {children}
      </main>
      <MiniPlayer />
      <BottomNav />
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}
