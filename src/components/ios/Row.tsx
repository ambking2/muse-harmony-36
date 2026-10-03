import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** The system colours a row's icon tile can take, named as Apple names them. */
export type RowTone =
  | "tint"
  | "green"
  | "orange"
  | "red"
  | "indigo"
  | "purple"
  | "teal"
  | "pink"
  | "gray";

const TONES: Record<RowTone, string> = {
  tint: "bg-ios-tint",
  green: "bg-ios-green",
  orange: "bg-ios-orange",
  red: "bg-ios-red",
  indigo: "bg-ios-indigo",
  purple: "bg-ios-purple",
  teal: "bg-ios-teal",
  pink: "bg-ios-pink",
  gray: "bg-ios-fill-strong",
};

/**
 * One row of a group — a floating panel in its own right.
 *
 * This is the app's `LabeledContent` + list row: an optional coloured icon
 * tile, a title with a secondary line under it, and a trailing value, control
 * or disclosure indicator. Give it `to` or `onClick` and the whole row becomes
 * the tap target — never a small clickable fragment inside a big one, and never
 * a div with a click handler pretending to be a button.
 *
 * Rows are at least 44pt tall so they are comfortably tappable, and they take
 * the shared press response. By default each row is its own floating panel;
 * `plain` drops that for rows that live inside a `card` already.
 */
export function Row({
  label,
  detail,
  value,
  icon: Icon,
  tone = "tint",
  to,
  onClick,
  accessory,
  destructive,
  plain,
  className,
}: {
  label: string;
  /** Second line under the title. */
  detail?: string;
  /** Trailing text — the right-hand value in a settings row. */
  value?: ReactNode;
  icon?: LucideIcon;
  tone?: RowTone;
  to?: string;
  onClick?: () => void;
  /** A control (switch, counter, badge) placed after the value. */
  accessory?: ReactNode;
  /** Renders the label in the system red — for destructive actions. */
  destructive?: boolean;
  /** Inside a `card`: no panel of its own, no border, no blur — the card is
   *  the floating element and the rows are just its contents. */
  plain?: boolean;
  className?: string;
}) {
  const interactive = Boolean(to || onClick);
  const showsChevron = interactive && !accessory;

  const body = (
    <>
      {Icon && (
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[0.7rem] text-white",
            TONES[tone],
          )}
          aria-hidden
        >
          <Icon className="size-[1.15rem]" strokeWidth={2} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "type-body block truncate",
            destructive ? "text-ios-red" : "text-ios-label",
          )}
        >
          {label}
        </span>
        {detail && (
          <span className="type-subheadline mt-0.5 block text-ios-label-secondary">{detail}</span>
        )}
      </span>

      {value !== undefined && (
        <span className="type-body shrink-0 text-ios-label-secondary">{value}</span>
      )}
      {accessory}
      {showsChevron && (
        <ChevronRight
          className="size-4 shrink-0 text-ios-label-tertiary rtl:rotate-180"
          strokeWidth={2.5}
          aria-hidden
        />
      )}
    </>
  );
  const classes = cn(
    "press flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-right",
    plain ? "" : "panel",
    interactive && "cursor-pointer hover:bg-ios-fill-soft active:bg-ios-fill",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}
