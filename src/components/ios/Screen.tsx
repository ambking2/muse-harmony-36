import { ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";

import { WordRise } from "@/components/ios/WordRise";
import { dur, fadeSlide, gsap } from "@/lib/design/motion-gsap";

/**
 * A page: its title, and what the title is about.
 *
 * There is no navigation bar. It used to be a floating pill of glass that
 * scrolled away and handed its title over to a compact one — the standard iOS
 * chrome. It was cut because this interface is one continuous surface: the
 * background is a living mesh, the elements float on it, and a bar of chrome
 * across the top was the one thing that did not belong to it. The title is now
 * simply the first line of the page, sitting on that background like
 * everything else.
 *
 * What is left is what the bar was actually doing: a heading, and a way back
 * on a screen that is not a tab root. Both are ordinary content now — the back
 * control is a labelled chevron above the title, at full tap height, where the
 * thumb already is.
 *
 * `Scroll` and the sticky positioning are gone with it, so a screen renders
 * once and never re-renders on scroll.
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
  back?: { to: string; label?: string };
  children: ReactNode;
}) {
  const headRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // The header arrives as one gesture (Rapport's `Ls` head timeline): the back
  // control slides in from the reading edge, the trailing actions follow a
  // beat later. The title runs its own masked rise inside `WordRise`.
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const backEl = head.querySelector("[data-back]");
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <div className="pb-4 pt-6" ref={headRef}>
        {back && <BackButton to={back.to} label={back.label ?? "بازگشت"} />}

        {largeTitle && (
          <>
            <WordRise text={title} className="type-large-title" />
            {subtitle && (
              <p className="type-subheadline mt-1 text-ios-label-secondary">{subtitle}</p>
            )}
          </>
        )}

        {actions && (
          <div className="mt-3 flex items-center gap-2" ref={actionsRef}>
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * The way back, as content rather than chrome.
 *
 * In a right-to-left app "back" is to the right, so the chevron is mirrored by
 * the layout rather than by JavaScript — the same `rtl:` flip every disclosure
 * indicator in the app uses. 44pt tall, like everything else you can tap.
 */
function BackButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      data-back
      className="press -me-1 mb-1 flex min-h-11 w-fit items-center gap-0.5 rounded-lg text-ios-tint"
    >
      <ChevronRight className="size-5 rotate-180 rtl:rotate-0" strokeWidth={2.2} />
      <span className="type-body">{label}</span>
    </Link>
  );
}
