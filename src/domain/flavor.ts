/**
 * The ten flavour dimensions, in CANONICAL order.
 *
 * ── Why this moved, and why the values changed ──────────────────────────────
 * Phase 1 shipped this list in `components/patterns/flavor.ts` with ten
 * plausible-but-invented names (`Salt`, `Sour`, `Heat`, `Fat`, `Smoke`, `Herb`,
 * `Acid`) in an invented order. They are not the canon. Both other repos agree
 * with each other and disagree with that list:
 *
 *   • Unity  `Core/Enums/FlavorDimension.cs` — `Sweet=0 … Fresh=9`, commented
 *     "Do NOT reorder or renumber", sourced from `08_Content_Data.md` §8.4.
 *   • Backend `config/balancing.json` → `flavorDimensions`, which closes
 *     `FlavorProfileSchema` as a `z.strictObject` over exactly these ten keys,
 *     and `prisma/seed.ts` writes them into `Dish.flavorProfile` JSONB.
 *
 * §1.3 settles the tie-break: Prisma is canonical, because it is the persisted
 * form and the wire format. So these are the keys, and this is the order.
 *
 * It lives in `domain/` rather than beside a component because it is domain
 * knowledge that a pattern happens to render — the catalogue export, the wire
 * schema, and the editor all need it, and only one of those is a component.
 *
 * ── ORDER IS LOAD-BEARING ───────────────────────────────────────────────────
 * The radar's shape depends on axis order, Unity's `FlavorAnchorTable` stores a
 * profile as a positional `int[10]`, and the catalogue export that feeds it is
 * index-based. Sorting this array — or letting a caller reorder it — silently
 * rewrites every anchor in the catalogue.
 */

export const FLAVOR_DIMENSIONS = [
  'Sweet',
  'Salty',
  'Acidic',
  'Bitter',
  'Umami',
  'Spicy',
  'Smoky',
  // The slash is in the canon and in the JSONB keys. Unity spells the same
  // member `FattyRich` because C# identifiers cannot carry one; the wire form
  // is what we mirror, and the display label below is where the slash is made
  // readable.
  'Fatty/Rich',
  'Herbal',
  'Fresh',
] as const;

export type FlavorDimension = (typeof FLAVOR_DIMENSIONS)[number];

/**
 * Display labels, separate from the wire keys.
 *
 * Only one dimension actually differs today, which is exactly why the record
 * exists: without it, `'Fatty/Rich'` would be rendered raw into an axis label
 * and a spinbutton name, and the first person to make it readable would do it
 * by editing the wire key.
 *
 * `Record<FlavorDimension, string>` is the exhaustiveness check — a dimension
 * added to the canon without a label here is a compile error, not a blank axis.
 */
export const FLAVOR_DIMENSION_LABELS: Readonly<Record<FlavorDimension, string>> = {
  Sweet: 'Sweet',
  Salty: 'Salty',
  Acidic: 'Acidic',
  Bitter: 'Bitter',
  Umami: 'Umami',
  Spicy: 'Spicy',
  Smoky: 'Smoky',
  'Fatty/Rich': 'Fatty / Rich',
  Herbal: 'Herbal',
  Fresh: 'Fresh',
};

/** Positional on the wire into Unity, keyed here for legibility. */
export type FlavorProfile = Readonly<Record<FlavorDimension, number>>;

/** An all-zero profile — the starting point for a newly authored dish. */
export function emptyFlavorProfile(): FlavorProfile {
  return Object.fromEntries(FLAVOR_DIMENSIONS.map((dimension) => [dimension, 0])) as FlavorProfile;
}

/** Positional array in canonical order, which is what Unity consumes. */
export function toFlavorArray(profile: FlavorProfile): readonly number[] {
  return FLAVOR_DIMENSIONS.map((dimension) => profile[dimension]);
}
