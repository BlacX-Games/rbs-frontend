/**
 * Banding shared by the readout patterns.
 *
 * A `.ts` because these are object consts, and
 * `react-refresh/only-export-components` rejects exporting one beside a
 * component — the same split `internal/control.ts` makes for the primitives.
 */

export interface ScoreTier {
  readonly key: string;
  readonly label: string;
  /** Inclusive lower bound on a 0–100 scale. */
  readonly from: number;
  /** A token reference, never a hex — see charts/chart.ts on why. */
  readonly fill: string;
}

/**
 * The four canon tiers.
 *
 * `balancing.json` is the machine-readable authority and the Unity
 * `ProgressionTierResolver` agrees; Milestone 3's fifth "ELITE" tier is the
 * outlier and is deliberately not built. The GDD's own band for Popular is
 * 61–85, which is what sets the boundaries here.
 */
export const SCORE_TIERS: readonly ScoreTier[] = [
  { key: 'new', label: 'New', from: 0, fill: 'var(--tier-new)' },
  { key: 'known', label: 'Known', from: 31, fill: 'var(--tier-known)' },
  { key: 'popular', label: 'Popular', from: 61, fill: 'var(--tier-popular)' },
  { key: 'beloved', label: 'Beloved', from: 86, fill: 'var(--tier-beloved)' },
];

/** The highest tier whose lower bound the value has reached. */
export function tierOf(value: number, tiers: readonly ScoreTier[] = SCORE_TIERS): ScoreTier {
  const found = [...tiers].reverse().find((tier) => value >= tier.from);

  // `tiers[0]` is only unreachable if the caller passed an empty array, which
  // the return type would otherwise quietly turn into `undefined`.
  if (found === undefined) throw new Error('ScoreDial needs at least one tier.');

  return found;
}
