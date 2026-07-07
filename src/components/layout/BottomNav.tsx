import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Library, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="glass-strong pointer-events-auto mx-3 flex w-full max-w-md items-center justify-around rounded-3xl border border-white/10 px-2 py-2 shadow-2xl">
        {items.map((it) => {
          const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-2 text-xs transition-all",
                active
                  ? "bg-white/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
              <span className={cn("text-[10px] font-medium", active && "text-primary")}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}