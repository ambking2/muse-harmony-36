import { Link, useRouterState } from "@tanstack/react-router";

import { DOCK_ITEMS, SEARCH_ITEM, tabForPath } from "@/lib/design/tabs";
import { cn } from "@/lib/utils";
import { Glass } from "glisse";
import { useLiquid } from "@/lib/liquid";

/**
 * The dock — one slab of frosted glass, and one circle beside it.
 *
 * Three destinations live in the pill (home, library, the profile) and search
 * floats beside it as its own circular button. Selection is colour alone: the
 * chosen tab tints, the others dim.
 *
 * The surface keeps only what belongs to the glass itself — deep frost, the
 * specular rim, the floating shadow. The displacement bend and the chromatic
 * fringe are not on the dock: on the in-app webview they rendered as dust
 * settled on the glass, and the artwork crossing under it went wavy.
 */
export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = tabForPath(pathname);
  const liquid = useLiquid();

  const glassRing = cn(
    "material lens specular dock-hero pointer-events-auto relative overflow-hidden",
    "border border-ios-separator shadow-[var(--floating-shadow)]",
  );

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="pointer-events-auto flex w-full items-center justify-center gap-2.5 px-5">
        <Glass
          className={cn(
            liquid && "lg-glass dock-hero",
            "flex w-[min(100%-3.75rem,19rem)] items-center justify-around rounded-[2.25rem] px-2 py-1.5",
            !liquid && glassRing,
          )}
        >
          {DOCK_ITEMS.map((item) => (
            <TabLink key={item.tab} item={item} active={current === item.tab} />
          ))}
        </Glass>

        <Link
          to={SEARCH_ITEM.to}
          aria-label={SEARCH_ITEM.label}
          className={cn(
            glassRing,
            "grid size-14 shrink-0 place-items-center rounded-full text-ios-label-secondary",
            "transition-colors duration-200 hover:text-ios-tint",
          )}
        >
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
        "press relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.75rem] px-3.5",
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
