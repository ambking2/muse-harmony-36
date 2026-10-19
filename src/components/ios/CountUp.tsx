import { useEffect, useRef } from "react";

import { countUp, statFlash } from "@/lib/design/motion-gsap";

/**
 * A number that counts to its value (Rapport's `uo`), formatted Persian by
 * default. The server renders the final number; on mount it counts up from
 * zero, and on later changes it continues from wherever it stopped — with an
 * optional flash when the number grows, so a library growing from 12 to 13
 * tracks reads as an event, not a re-render.
 */
export function CountUp({
  value,
  format,
  flash = false,
  duration = 1.2,
  className,
}: {
  value: number;
  /** Defaults to grouped Persian digits. */
  format?: (value: number) => string;
  flash?: boolean;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const grew = value > previous.current;
    previous.current = value;
    countUp(el, value, format, { duration });
    if (flash && grew) statFlash(el);
  }, [value, format, flash, duration]);

  return (
    <span ref={ref} className={className}>
      {format ? format(value) : value.toLocaleString("fa-IR")}
    </span>
  );
}
