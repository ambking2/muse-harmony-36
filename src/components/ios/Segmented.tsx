import { SegmentedControl } from "glisse";

import { cn } from "@/lib/utils";

/**
 * Shared Glisse segmented control. Keeps the existing controlled string API
 * so every screen can adopt the optical control without changing its state.
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
  return (
    <SegmentedControl
      value={value}
      onValueChange={(next) => onChange(next as T)}
      items={[...options].reverse().map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      className={cn("muis-glisse-segmented", className)}
      aria-label="انتخاب گزینه"
    />
  );
}
