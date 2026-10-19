import { Link, useRouterState } from "@tanstack/react-router";

import { DOCK_ITEMS, SEARCH_ITEM, tabForPath } from "@/lib/design/tabs";
import { useGlassMode } from "@/lib/glass";
import { cn } from "@/lib/utils";

/**
 * The dock — one slab of liquid glass, and one circle beside it.
 *
 * Three destinations live in the pill (home, library, the profile) and search
 * floats beside it as its own circular button. Selection is colour alone: the
 * chosen tab tints, the others dim. No pill, no travelling marker, no pointer
 * spotlight — those read as extra grey objects sitting on the glass.
 *
 * The slab keeps the liquid-glass layers that belong to the surface itself
 * (deep frost, the bent edge, the specular rim, the faint chromatic fringe)
 * and nothing painted on top of them.
 */
export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = tabForPath(pathname);
  const glass = useGlassMode();

  const glassRing = cn(
    "material lens specular dock-hero pointer-events-auto relative overflow-hidden",
    "border border-ios-separator shadow-[var(--floating-shadow)]",
    glass === "on" && "chromatic",
  );

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="pointer-events-auto flex w-full items-center justify-center gap-2.5 px-5">
        <div
          className={cn(
            glassRing,
            "flex w-[min(100%-3.75rem,19rem)] items-center justify-around rounded-[1.6rem] px-1.5 py-1.5",
          )}
        >
          {glass === "on" && <span className="lens-bend" aria-hidden />}
          {DOCK_ITEMS.map((item) => (
            <TabLink key={item.tab} item={item} active={current === item.tab} />
          ))}
        </div>

        <Link
          to={SEARCH_ITEM.to}
          aria-label={SEARCH_ITEM.label}
          className={cn(
            glassRing,
            "grid size-14 shrink-0 place-items-center rounded-full text-ios-label-secondary",
            "transition-colors duration-200 hover:text-ios-tint",
          )}
        >
          {glass === "on" && <span className="lens-bend" aria-hidden />}
          <SEARCH_ITEM.icon className="size-6" strokeWidth={1.8} />
        </Link>
      </div>
    </nav>
  );
}

function TabLink({ item, active }: { item: (typeof DOCK_ITEMS)[number]; active: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] px-3.5",
        "transition-colors duration-200",
        active ? "text-ios-tint" : "text-ios-label-secondary",
      )}
    >
      <item.icon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
      <span className="type-caption leading-none" style={{ opacity: active ? 1 : 0.72 }}>
        {item.label}
      </span>
    </Link>
  );
}
