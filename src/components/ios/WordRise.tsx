import { useEffect, useRef } from "react";

import { wordRise } from "@/lib/design/motion-gsap";

/**
 * The screen title, arriving the Rapport way: the words rise out of their own
 * masks with a slight rotation, one after another.
 *
 * The heading renders its full text immediately — the server sends a complete,
 * readable page — and the split happens on mount, keyed by the text so a
 * navigation that only changes the title re-runs the rise.
 */
export function WordRise({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const tween = ref.current ? wordRise(ref.current) : null;
    return () => {
      tween?.kill();
    };
  }, [text]);

  return (
    <h1 ref={ref} className={className}>
      {text}
    </h1>
  );
}
