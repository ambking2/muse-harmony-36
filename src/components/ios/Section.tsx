import { Children, type ReactNode } from "react";

import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

/**
 * A group of elements under one small heading.
 *
 * The members are separate floating panels with a gap between them rather than
 * rows welded into a single card — nothing is attached to its neighbour, so
 * every element can be glass in its own right and the screen stays legible when
 * it sits over a blurred cover.
 *
 * Members arrive one beat after the previous one (staggered scroll reveal), so
 * a section assembles itself instead of appearing in one block.
 *
 * Children are the units that get separated. Group several controls into one
 * floating element by wrapping them in an element with the `card` utility.
 */
export function Section({
  title,
  footer,
  action,
  children,
  className,
}: {
  title?: string;
  /** Small explanatory text under the group — iOS uses these for footnotes. */
  footer?: string;
  /** Optional trailing control in the header, e.g. an "edit" button. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8", className)}>
      {(title || action) && (
        <div className="mb-2 flex items-end justify-between gap-3 px-4">
          {title && <h2 className="type-footnote text-ios-label-secondary">{title}</h2>}
          {action}
        </div>
      )}
      <div className="space-y-2">
        {Children.map(children, (child, index) => (
          <Reveal key={index} index={index}>
            {child}
          </Reveal>
        ))}
      </div>
      {footer && <p className="type-footnote mt-3 px-4 text-ios-label-secondary">{footer}</p>}
    </section>
  );
}
