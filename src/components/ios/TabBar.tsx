import { motion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";

import { TAB_ITEMS, tabForPath } from "@/lib/design/tabs";
import { morph, snappy } from "@/lib/design/motion";
import { useGlassMode } from "@/lib/glass";
import { cn } from "@/lib/utils";

/**
 * The tab bar — floating glass that tells you where you are by moving.
 *
 * It **floats**, detached from the page, in the same material as the rest of
 * the app; it **refracts** what scrolls under it (a track title crossing the
 * dock bends as it goes); it catches a **specular** rim with the highlight
 * sliding along it as the pointer moves.
 *
 * The selection is a single dot that **travels** from one tab to the next on a
 * spring, rather than a filled square that blinks in and out. That is the whole
 * difference between a tab bar and a row of links: the reader sees the change
 * happen. It stays a dot on purpose — the destination itself is carried by
 * colour on the icon and its label, so the control never becomes a block that
 * hides the icon it is meant to point at.
 *
 * Nothing here enlarges the icons under the pointer. A dock that rearranges
 * itself while a finger is on it moves the target, and this one gets tapped
 * five times a minute.
 */
export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = tabForPath(pathname);
  const glass = useGlassMode();

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div
        className={cn(
          "material lens specular spotlight pointer-events-auto relative flex w-[min(100%-1.5rem,30rem)] items-stretch",
          "justify-around overflow-hidden rounded-[1.75rem] border border-ios-separator px-1.5 py-1",
          "shadow-[var(--floating-shadow)]",
          glass === "on" && "chromatic",
        )}
      >
        {glass === "on" && <span className="lens-bend" aria-hidden />}
        {glass === "on" && <span className="refract opacity-40" aria-hidden />}
        {TAB_ITEMS.map((item) => (
          <TabLink key={item.tab} item={item} active={current === item.tab} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ item, active }: { item: (typeof TAB_ITEMS)[number]; active: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1"
    >
      {active && (
        <motion.span
          layoutId="tab-indicator"
          transition={morph}
          className="absolute inset-x-0 bottom-1 mx-auto h-1 w-5 rounded-full bg-ios-tint"
          aria-hidden
        />
      )}

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
