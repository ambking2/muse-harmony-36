import { useEffect, useState } from "react";

/**
 * True once the client has hydrated.
 *
 * Entrance animations start from a hidden state, which means the server-rendered
 * HTML would arrive with its content invisible — fine for a page whose content
 * is fetched anyway, wrong for a list of songs, and wrong for anyone reading it
 * with JavaScript off. Components that animate themselves in check this first
 * and render plainly on the server, so the first paint is always the complete
 * page and the motion is only ever an enhancement.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
