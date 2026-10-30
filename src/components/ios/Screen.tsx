import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Link, useRouter, useRouterState } from "@tanstack/react-router";

import { WordRise } from "@/components/ios/WordRise";
import { dur, fadeSlide, gsap } from "@/lib/design/motion-gsap";
import { cn } from "@/lib/utils";

/**
 * A page: its title, and what the title is about.
 *
 * There is no navigation bar. It used to be a floating pill of glass that
 * scrolled away and handed its title over to a compact one — the standard iOS
 * chrome. It was cut because this interface is one continuous surface: the
 * background is a living mesh, the elements float on it, and a bar of chrome
 * across the top was the one thing that did not belong to it. The title is
 * now simply the first line of the page, sitting on that background like
 * everything else.
 *
 * What survived from that bar are the controls, and they behave like the dock
 * now: fixed to the top of the viewport while the page scrolls under them —
 * the back circle at the reading edge, the page's own actions (a create
 * button, a menu) at the other end, each its own object. Every screen except
 * home carries the back circle automatically; a screen can still aim it at an
 * exact route by passing `back: { to }`, or opt out with `back: false`.
 */
export function Screen({
  title,
  subtitle,
  largeTitle = true,
  actions,
  back,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Turn off for a screen that has its own header art, like the player. */
  largeTitle?: boolean;
  /** Trailing controls beside the title — pass buttons, they inherit sizing. */
  actions?: ReactNode;
  /** Default: a history-back circle on every screen except home. */
  back?: boolean | { to: string; label?: string };
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showBack = back === undefined ? pathname !== "/" : back !== false;
  const hasBar = showBack || Boolean(actions);
  const barRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [homeHasScrolled, setHomeHasScrolled] = useState(false);

  // On the home screen, keep the title crisp on first entry. Enable the top
  // frost only after the user starts scrolling the content beneath it.
  useEffect(() => {
    if (pathname !== "/") {
      setHomeHasScrolled(false);
      return;
    }
    const update = () => setHomeHasScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  // The controls arrive as one gesture (Rapport's `Ls` head timeline): the
  // back circle slides in from the reading edge, the actions follow a beat
  // later. The title runs its own masked rise inside `WordRise`.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const backEl = bar.querySelector("[data-back]");
    if (backEl) {
      // Mirrored from Rapport's `x: -14`: in this RTL app back lives on the
      // reading edge, which is the right.
      gsap.fromTo(
        backEl,
        { opacity: 0, x: 14 },
        {
          opacity: 1,
          x: 0,
          duration: dur(0.6),
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
      );
    }
    if (actionsRef.current) {
      fadeSlide([...actionsRef.current.children], { y: 14, stagger: 0.08, delay: 0.12 });
    }
  }, []);

  const to = typeof back === "object" ? back.to : undefined;

  return (
    <>
      {/* Keep the same disappearing-content frost on home too, even though
          home intentionally has no fixed back/actions bar. */}
      <div aria-hidden="true" className={cn("screen-top-frost pointer-events-none fixed inset-x-0 top-0 z-30 h-32", pathname === "/" && !homeHasScrolled && "screen-top-frost-idle")} />
      {hasBar && (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
          <div
            ref={barRef}
            className="pointer-events-auto flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),0.75rem)]"
          >
            {showBack && <BackButton to={to} />}
            {actions && (
              <div className="flex items-center gap-2" ref={actionsRef}>
                {actions}
              </div>
            )}
          </div>
          </div>
        </>
      )}

      <div className="mx-auto w-full max-w-3xl px-4">
        <div
          className={cn(
            "pb-5",
            hasBar ? "pt-[calc(max(env(safe-area-inset-top),0.75rem)+3.75rem)]" : "pt-7",
          )}
        >
          {largeTitle && (
            <>
              <WordRise text={title} className="type-large-title" />
              {subtitle && (
                <p
                  suppressHydrationWarning
                  className="type-subheadline mt-1 text-ios-label-secondary"
                >
                  {subtitle}
                </p>
              )}
            </>
          )}
        </div>
        {children}
      </div>
    </>
  );
}

/**
 * The way back, as its own object.
 *
 * A circular glass button — the same material as the dock's search circle —
 * holding only the chevron, and going back through history like an iPhone
 * does; a screen can aim it at an exact route instead, and a direct landing
 * (no history to unwind) falls home. In a right-to-left app "back" is to the
 * right, so the chevron is mirrored by the layout rather than by JavaScript.
 */
function BackButton({ to }: { to?: string }) {
  const router = useRouter();
  const go = () => {
    if (window.history.length > 1) router.history.back();
    else void router.navigate({ to: to ?? "/" });
  };

  const face = <ChevronRight className="size-5 rotate-180 rtl:rotate-0" strokeWidth={2.2} />;

  if (to) {
    return (
      <Link
        to={to}
        data-back
        aria-label="بازگشت"
        className="glass-btn lens specular spotlight screen-back-button press isolate overflow-hidden text-ios-tint"
      >
        <span className="lens-bend" aria-hidden="true" />
        <span className="refract" aria-hidden="true" />
        <span className="relative z-10">{face}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={go}
      data-back
      aria-label="بازگشت"
      className="glass-btn screen-back-button press text-ios-tint"
    >
      <span className="lens-bend" aria-hidden="true" />
      <span className="refract" aria-hidden="true" />
      <span className="relative z-10">{face}</span>
    </button>
  );
}
