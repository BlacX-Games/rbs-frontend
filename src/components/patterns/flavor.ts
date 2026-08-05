/**
 * The ten flavour dimensions, in CANONICAL order.
 *
 * A `.ts` and not `internal/`: callers need this to build a `FlavorProfile`, so
 * it is public API. It lives outside the component file because
 * `react-refresh/only-export-components` rejects an exported array const beside
 * one — the same split `charts/chart.ts` and `patterns/internal/scale.ts` make.
 *
 * ORDER IS LOAD-BEARING. The radar's shape depends on axis order, Unity's
 * `FlavorAnchorTable` stores these as a positional `int[10]`, and the catalogue
 * export that feeds it is index-based. Sorting this array — or letting a caller
 * reorder it — silently rewrites every anchor in the catalogue.
 */
export const FLAVOR_DIMENSIONS = [
  'Salt',
  'Sweet',
  'Sour',
  'Bitter',
  'Umami',
  'Heat',
  'Fat',
  'Smoke',
  'Herb',
  'Acid',
] as const;

export type FlavorDimension = (typeof FLAVOR_DIMENSIONS)[number];

/** Positional on the wire, keyed here for legibility. */
export type FlavorProfile = Readonly<Record<FlavorDimension, number>>;

/** An all-zero profile — the starting point for a newly authored dish. */
export function emptyFlavorProfile(): FlavorProfile {
  return Object.fromEntries(FLAVOR_DIMENSIONS.map((dimension) => [dimension, 0])) as FlavorProfile;
}

/** Positional array in canonical order, which is what Unity consumes. */
export function toFlavorArray(profile: FlavorProfile): readonly number[] {
  return FLAVOR_DIMENSIONS.map((dimension) => profile[dimension]);
}
