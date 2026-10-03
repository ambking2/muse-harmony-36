import { Link, useRouterState } from "@tanstack/react-router";

import { TAB_ITEMS, tabForPath } from "@/lib/design/tabs";
import { useGlassMode } from "@/lib/glass";
import { cn } from "@/lib/utils";

/**
 * The tab bar — floating glass, and nothing else.
 *
 * It **floats**, detached from the page, in the same material as the rest of
 * the app; it **refracts** what scrolls under it (a track title crossing the
 * dock bends as it goes); it catches a **specular** rim with the highlight
 * sliding along it as the pointer moves.
 *
 * What it deliberately does not do is move. No magnification under the pointer,
 * no lift, no growing pill behind the current tab: a bar that rearranges itself
 * while the finger is on it makes the target you were aiming for move, and on
 * a dock that is aimed at five times a minute, that is a tax for nothing. The
 * current tab is therefore told by colour alone — icon and label in the app's
 * tint, everything else secondary.
 *
 * Because nothing here animates, the bar renders once per navigation instead
 * of tracking every pointer move across it.
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
          <Link
            key={item.tab}
            to={item.to}
            aria-current={current === item.tab ? "page" : undefined}
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors"
          >
            <item.icon
              className={cn(
                "size-6",
                current === item.tab ? "text-ios-tint" : "text-ios-label-secondary",
              )}
              strokeWidth={current === item.tab ? 2.2 : 1.8}
              aria-hidden
            />
            <span
              className={cn(
                "type-caption leading-none",
                current === item.tab ? "text-ios-tint" : "text-ios-label-secondary",
              )}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
