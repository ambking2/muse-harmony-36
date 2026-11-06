import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Match the smooth-wheel behavior used by the hi project.
 * Touch devices keep native scrolling and reduced-motion preferences are respected.
 */
export function SmoothScroll() {
  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Let Lenis own programmatic scrolling too; avoid the browser CSS smooth-scroll\n    // rule and Lenis easing competing with one another.\n    const root = document.documentElement;\n    const previousScrollBehavior = root.style.scrollBehavior;\n    root.style.scrollBehavior = "auto";\n\n    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: !isTouch && !prefersReducedMotion,
      // Keep native touch momentum; JS-driven touch inertia feels less responsive.
      syncTouch: false,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Preserve smooth in-page anchor navigation.
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const anchor = target.closest("a[href^='#']") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      const element = document.querySelector(href);
      if (element) {
        event.preventDefault();
        lenis.scrollTo(element as HTMLElement, { offset: -80 });
      }
    };

    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", onClick);
      lenis.destroy();\n      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return null;
}
