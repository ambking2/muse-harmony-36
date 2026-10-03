import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { TAB_ITEMS, tabForPath } from "@/lib/design/tabs";
import { snappy } from "@/lib/design/motion";
import { useGlassMode } from "@/lib/glass";
import { cn } from "@/lib/utils";

/**
 * The tab bar — a magnifying dock of floating glass.
 *
 * Three things make it read as the current iOS tab bar rather than a row of
 * links:
 *
 * - it **floats**, detached from the page, with the same material everywhere
 *   else in the app;
 * - the icons **magnify** under the pointer, falling off with distance the way
 *   a dock does, on a spring so they overshoot slightly and settle;
 * - the surface **refracts** what scrolls under it — a track title crossing the
 *   dock bends as it goes — and catches a **specular** rim, with the highlight
 *   sliding along that rim as the pointer moves.
 *
 * Magnification runs on motion values rather than state, so dragging across the
 * bar never re-renders the page — the springs write straight to the DOM.
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
        <DockItems active={current} />
      </div>
    </nav>
  );
}

/** The five destinations, each with its own magnification spring. */
function DockItems({ active }: { active: ReturnType<typeof tabForPath> }) {
  const barRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={barRef} className="relative flex w-full items-stretch justify-around">
      {TAB_ITEMS.map((item, index) => (
        <DockItem
          key={item.tab}
          item={item}
          index={index}
          active={active === item.tab}
          bar={barRef}
        />
      ))}
    </div>
  );
}

function DockItem({
  item,
  index,
  active,
  bar,
}: {
  item: (typeof TAB_ITEMS)[number];
  index: number;
  active: boolean;
  bar: React.RefObject<HTMLDivElement | null>;
}) {
  // Pointer position across the bar, in element space. A motion value, so
  // reading it during a move costs nothing.
  const pointer = useMotionValue(-1);

  // Magnification: full size under the pointer, easing to nothing about one
  // item's width away — the same falloff a physical dock has.
  const distance = useTransform(pointer, (x) => (x < 0 ? Infinity : Math.abs(x - index)));
  const scale = useTransform(distance, [0, 1, 2], [1.42, 1.16, 1]);
  const lift = useTransform(distance, [0, 1, 2], [-4, -2, 0]);

  const springScale = useSpring(scale, { stiffness: 380, damping: 26, mass: 0.6 });
  const springLift = useSpring(lift, { stiffness: 320, damping: 30 });

  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    // A dock magnifies under a cursor, not a finger; on touch it stays flat.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const track = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      const slot = box.width / TAB_ITEMS.length;
      pointer.set((event.clientX - box.left) / slot - 0.5);
    };
    const leave = () => pointer.set(-1);

    element.addEventListener("pointermove", track);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", track);
      element.removeEventListener("pointerleave", leave);
    };
  }, [bar, pointer]);

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className="relative flex min-h-14 flex-1 items-center justify-center"
    >
      <motion.span
        style={{ scale: springScale, y: springLift }}
        transition={snappy}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "flex flex-col items-center gap-1 rounded-[0.9rem] px-3 py-1.5 transition-colors",
          // The selected destination gets its own tinted tile inside the tray,
          // so "where am I" is a shape and not only a colour.
          active ? "bg-ios-tint/12 text-ios-tint" : "text-ios-label-secondary",
        )}
      >
        <item.icon className="size-6" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
        <span className="type-caption leading-none">{item.label}</span>
      </motion.span>
    </Link>
  );
}
