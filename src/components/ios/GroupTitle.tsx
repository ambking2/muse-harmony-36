import type { ReactNode } from "react";

/**
 * A group's name at the top of its card.
 *
 * The heading is the only thing that says what the rows below it are, so it is
 * small, tinted with the app's accent, and set apart from the first row only by
 * its own padding — a hairline under it would turn the card into a table. The
 * optional value on the far edge is the one number a group is summarised by.
 */
export function GroupTitle({ children, value }: { children: ReactNode; value?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-4">
      <h2 className="type-footnote font-semibold text-ios-tint">{children}</h2>
      {value !== undefined && (
        <span className="type-footnote shrink-0 text-ios-label-secondary">{value}</span>
      )}
    </div>
  );
}
