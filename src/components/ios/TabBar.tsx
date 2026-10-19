import { motion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";

import { DOCK_ITEMS, SEARCH_ITEM, tabForPath } from "@/lib/design/tabs";
import { snappy } from "@/lib/design/motion";
import { useGlassMode } from "@/lib/glass";
import { cn } from "@/lib/utils";

/**
 * The dock — floating glass, and one circle beside it.
 *
 * Three destinations live in the pill (home, library, the player) and search
 * floats beside it as its own circular button, the way a camera sits beside
 * the mode tabs in a camera app: one control, one job, always the same place.
 *
 * The pill **floats**, detached from the page, in the same material as the
 * rest of the app; it **refracts** what scrolls under it (a track title
 * crossing the dock bends as it goes); it catches a **specular** rim with the
 * highlight sliding along it as the pointer moves.
 *
 * Selection is carried by colour on the icon and its label — the control never
 * becomes a block that hides the icon it is meant to point at. Nothing here
 * enlarges the icons under the pointer: a dock that rearranges itself while a
 * finger is on it moves the target, and this one gets tapped five times a
 * minute.
 */
export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = tabForPath(pathname);
  const glass = useGlassMode();

  const glassRing = cn(
    "material lens specular spotlight pointer-events-auto relative overflow-hidden",
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
            "flex w-[min(100%-3.75rem,19rem)] items-stretch justify-around rounded-[1.75rem] px-1.5 py-1",
          )}
        >
          {glass === "on" && <span className="lens-bend" aria-hidden />}
          {glass === "on" && <span className="refract opacity-40" aria-hidden />}
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
      className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1"
    >
      <motion.span
        aria-hidden
        animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
        whileTap={{ scale: active ? 0.96 : 0.9 }}
        transition={snappy}
        className={cn(
          "flex flex-col items-center gap-1 transition-colors duration-200",
          active ? "text-ios-tint" : "text-ios-label-secondary",
        )}
      >
        <item.icon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
        <motion.span
          animate={{ opacity: active ? 1 : 0.72 }}
          transition={snappy}
          className="type-caption leading-none"
        >
          {item.label}
        </motion.span>
      </motion.span>
    </Link>
  );
}
