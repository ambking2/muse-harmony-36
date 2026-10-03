import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { useMounted } from "@/hooks/use-mounted";
import { standard } from "@/lib/design/motion";

/**
 * Staggered scroll reveal.
 *
 * A screen's elements do not all arrive at once: each one rises and fades in a
 * beat after the one above it, so a long list assembles itself as it is read.
 *
 * Four rules keep it from being decoration:
 *
 * - `once` — an element never re-animates on the way back up. On a screen this
 *   tall, repeating the reveal reads as flicker.
 * - the stagger saturates after a few items. A hundred-track queue would take
 *   four seconds to finish appearing, which is not an entrance, it is a wait.
 * - it only starts after hydration, so the server-rendered page is complete and
 *   readable on its own.
 * - with Reduce Motion on, the entrance becomes a plain opacity change rather
 *   than a movement — the same information, none of the travel.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  /** Position within its group; drives the delay. */
  index?: number;
  className?: string;
}) {
  const mounted = useMounted();
  const reduce = useReducedMotion();

  if (!mounted) return <div className={className}>{children}</div>;

  const delay = Math.min(index, 8) * 0.04;

  if (reduce) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...standard, delay }}
    >
      {children}
    </motion.div>
  );
}
