import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Library, Heart, User, AudioLines, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Listen", icon: Home },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Main navigation" className="app-dock glass-strong flex flex-col">
      <Link to="/" aria-label="muis home" className="mb-12 hidden items-center gap-2.5 px-3 pt-3 lg:flex">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><AudioLines className="size-5" /></span>
        <span className="text-2xl font-bold tracking-tight">muis<span className="text-primary">.</span></span>
      </Link>
      <p className="eyebrow mb-4 hidden px-4 text-muted-foreground lg:block">Your sound space</p>
      <div className="grid grid-cols-5 gap-1 lg:flex lg:flex-col lg:gap-2">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined}
              className={cn("relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.4rem] px-1 py-2 transition-colors lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-4", active ? "bg-white/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-foreground")}>
              <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.3 : 1.7} />
              <span className="truncate text-[10px] font-medium lg:text-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto hidden px-3 pb-2 lg:block">
        <div className="mb-5 h-px bg-white/10" />
        <Link to="/settings" className="flex min-h-11 items-center gap-3 text-sm text-muted-foreground hover:text-foreground"><Settings aria-hidden="true" className="size-4" /> Settings</Link>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Less noise.<br />More music.</p>
      </div>
    </nav>
  );
}
