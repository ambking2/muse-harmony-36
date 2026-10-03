import { motion } from "framer-motion";

import { useMounted } from "@/hooks/use-mounted";
import { snappy } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

/**
 * The segmented control.
 *
 * Used where iOS uses one: a screen that is really two or three pages wearing
 * one title, like «آهنگ‌ها / پلی‌لیست‌ها / تاریخچه» in the library. Tabs that
 * open different screens belong in the tab bar instead.
 *
 * Selection is carried by an enum-like string value, and the sliding highlight
 * is one shared layout element so the selection glides between segments
 * instead of blinking.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
}) {
  // The sliding highlight is a shared layout element. Before hydration there is
  // nothing to slide from, so the selected segment simply sits on its fill.
  const mounted = useMounted();

  return (
    <div role="tablist" className={cn("flex gap-0.5 rounded-xl bg-ios-fill p-0.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "type-subheadline relative min-h-10 flex-1 rounded-[0.625rem] px-2 font-medium",
              active ? "text-ios-label" : "text-ios-label-secondary",
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-highlight"
                transition={snappy}
                className="absolute inset-0 rounded-[0.625rem] bg-ios-surface-raised shadow-sm"
                initial={mounted ? false : { opacity: 0 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
