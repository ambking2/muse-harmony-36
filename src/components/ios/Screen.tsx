import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";

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
  subtitle?: string;
  /** Turn off for a screen that has its own header art, like the player. */
  largeTitle?: boolean;
  /** Trailing controls beside the title — pass buttons, they inherit sizing. */
  actions?: ReactNode;
  back?: { to: string; label?: string };
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <div className="pb-4 pt-6">
        {back && <BackButton to={back.to} label={back.label ?? "بازگشت"} />}

        {largeTitle && (
          <>
            <h1 className="type-large-title">{title}</h1>
            {subtitle && (
              <p className="type-subheadline mt-1 text-ios-label-secondary">{subtitle}</p>
            )}
          </>
        )}

        {actions && <div className="mt-3 flex items-center gap-2">{actions}</div>}
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
      className="press -me-1 mb-1 flex min-h-11 w-fit items-center gap-0.5 rounded-lg text-ios-tint"
    >
      <ChevronRight className="size-5 rotate-180 rtl:rotate-0" strokeWidth={2.2} />
      <span className="type-body">{label}</span>
    </Link>
  );
}
