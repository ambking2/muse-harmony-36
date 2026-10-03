/**
 * The tile palette, as class names.
 *
 * Written out in full rather than built from a name at runtime because
 * Tailwind reads the source for class strings: a `bg-tile-${name}` would never
 * make it into the stylesheet, and the tile would fall back to no colour at
 * all. Every colour here exists in `styles.css` under the same name.
 */
export const TILE_CLASS = {
  blue: "bg-tile-blue",
  cyan: "bg-tile-cyan",
  sky: "bg-tile-sky",
  violet: "bg-tile-violet",
  rose: "bg-tile-rose",
  orange: "bg-tile-orange",
  amber: "bg-tile-amber",
  green: "bg-tile-green",
  lime: "bg-tile-lime",
} as const;

export type TileName = keyof typeof TILE_CLASS;

const TILES = Object.keys(TILE_CLASS) as TileName[];

/**
 * The colour a square gets when nothing else decides it.
 *
 * A song with no cover art used to fall back to grey, and a screen full of
 * them looked broken rather than empty. Instead the key is hashed: the same
 * track always gets the same colour, so scrolling back and forth does not make
 * the list shuffle, and two tracks side by side almost never match.
 *
 * Hash is a plain rolling sum — it is not a cryptographic hash and does not
 * need to be; it only has to be stable and spread keys out.
 */
export function tileFor(key: string | undefined): TileName {
  let hash = 0;
  for (let index = 0; index < (key?.length ?? 0); index += 1) {
    hash = (hash * 31 + (key as string).charCodeAt(index)) % 100_003;
  }
  return TILES[hash % TILES.length];
}
