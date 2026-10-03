import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The app's one "nothing here" screen.
 *
 * Deliberately a component rather than markup repeated per page: an empty
 * search, an empty library and an empty download list should all look and read
 * the same, and a screen that invents its own version drifts.
 *
 * Icon, title, description, then at most one action — the shape iOS uses for
 * every unavailable-content view.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {Icon && (
        <span
          className="grid size-16 place-items-center rounded-full bg-ios-fill text-ios-label-tertiary"
          aria-hidden
        >
          <Icon className="size-7" strokeWidth={1.5} />
        </span>
      )}
      <h3 className="type-title-3 mt-4">{title}</h3>
      {description && (
        <p className="type-subheadline mt-2 max-w-xs text-ios-label-secondary">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
