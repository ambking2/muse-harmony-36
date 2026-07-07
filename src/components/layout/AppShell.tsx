import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "../player/MiniPlayer";
import { CommandPalette } from "../CommandPalette";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard";

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CommandPalette />
      <main className="mx-auto max-w-6xl px-4 pb-56 pt-6 sm:px-6 md:pb-40">
        {children}
      </main>
      <MiniPlayer />
      <BottomNav />
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}