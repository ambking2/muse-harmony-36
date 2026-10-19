import { motion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";

import { DOCK_ITEMS, SEARCH_ITEM, tabForPath } from "@/lib/design/tabs";
import { snappy } from "@/lib/design/motion";
import { useGlassMode } from "@/lib/glass";
import { cn } from "@/lib/utils";

/**
 * The dock — one slab of liquid glass, and one circle beside it.
 *
 * Three destinations live in the pill (home, library, the account) and search
 * floats beside it as its own circular button. The selected tab is not a dot
 * or a colour swap: it is a **raised frosted pill** that the icon and label
 * sit inside, the way the reference dock marks Tonight — the selection is an
 * object you could pick up, not a highlight that happened to land.
 *
 * The slab `dock-hero`s itself: deeper frost than the default chrome, a
 * louder chromatic rim, and it refracts what scrolls under it — except the
 * artwork, which stays put (see `.refract` in styles.css). Nothing here
 * enlarges icons under the pointer: a dock that rearranges itself while a
 * finger is on it moves the target, and this one gets tapped five times a
 * minute.
 */
export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = tabForPath(pathname);
  const glass = useGlassMode();

  const glassRing = cn(
    "material lens specular spotlight dock-hero pointer-events-auto relative overflow-hidden",
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
      className={cn(
        "press relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] px-3.5",
        "transition-[background-color,box-shadow] duration-200",
        active &&
          "bg-ios-surface-raised/90 shadow-[inset_0_1px_0_oklch(1_0_0/.35),0_2px_10px_-4px_oklch(0_0_0/.25)]",
      )}
    >
      <motion.span
        aria-hidden
        animate={{ scale: active ? 1.06 : 1, y: active ? -1 : 0 }}
        whileTap={{ scale: active ? 0.96 : 0.9 }}
        transition={snappy}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-colors duration-200",
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
