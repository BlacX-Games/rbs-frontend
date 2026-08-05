/**
 * Rounding and clamping, mirrored from the deterministic sim.
 *
 * ── The convention, and the disagreement it settles ─────────────────────────
 * `appendix/A_Balancing.md` §A.1 requires ONE rounding convention applied
 * everywhere, so a score shown in Unity, a score persisted by the backend, and
 * a score printed on this dashboard can never disagree. Three implementations
 * exist and two of them agree:
 *
 *   • Unity `Systems/Rounding/ScoreRounding.cs`
 *       `Math.Round(x, MidpointRounding.AwayFromZero)` → −2.5 rounds to −3.
 *   • rbs-backend `domain/formulas/rounding.ts`
 *       `Math.round(x)` after noise normalization, documented as
 *       "ties go toward +∞ (2.5 → 3, −2.5 → −2)" → −2.5 rounds to −2.
 *
 * §1.3 names the Unity harness the authority, so **this module rounds away from
 * zero**. The two agree on every value ≥ 0 — which is every score, since every
 * formula input and output is clamped to [0, 100] — so the divergence is live
 * on exactly one field: `ServiceSession.reputationChange`, which is signed.
 * Raised as an open decision (§14) rather than patched in either repo.
 *
 * Nothing else in `src/` may call `Math.round` or `toFixed` on a domain value.
 */

/**
 * Float noise is normalized away before rounding, or the convention leaks.
 *
 * Every score is a weighted sum of 0–100 integers against two-decimal weights,
 * so exact `.5` ties are common — but IEEE-754 lands them at
 * `x.4999999999999996` often enough that raw rounding would send a tie *down*
 * and break the rule. Twelve significant digits sits far above that ~1e-14
 * error and far below any magnitude the game uses.
 *
 * The deliberate consequence: anything within ~1e-12 of a tie is treated *as*
 * the tie. `82.80000000000001` — the canon CQS golden value — becomes 83, which
 * is what the Unity harness asserts. This reasoning, and the constant, are
 * lifted from the backend's implementation; only the tie DIRECTION differs.
 */
const PRECISION = 12;

/**
 * Round half away from zero: `2.5 → 3`, `−2.5 → −3`, `−0.5 → −1`.
 *
 * `Math.round` cannot express this. It ties toward +∞, so it returns `-0` for
 * `-0.5` — a value that stringifies as `"0"`, compares equal to `0`, and
 * survives `JSON.stringify` as `-0` in some encoders. Every one of those is a
 * different way for a signed reputation change to be silently wrong.
 */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`roundHalfUp received a non-finite value: ${String(value)}`);
  }

  const normalized = Number(value.toPrecision(PRECISION));

  // Rounding the magnitude and re-applying the sign is what makes this
  // away-from-zero: `Math.round(2.5)` is 3 in both conventions, and the sign
  // never participates. Doing it as `Math.sign(x) * Math.round(Math.abs(x))`
  // would reintroduce `-0` for values that round to zero, which is the bug this
  // function exists to avoid — hence the explicit branch.
  const magnitude = Math.round(Math.abs(normalized));

  if (magnitude === 0) return 0;
  return normalized < 0 ? -magnitude : magnitude;
}

/** Every component score in the design is 0–100 (`B_Formulas.md` preamble). */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/** Generic clamp — reputation and morale share the score band; cash does not. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) throw new TypeError('clamp received NaN');
  return Math.min(Math.max(value, min), max);
}

/** Constrain to the 0–100 band every formula input and output shares. */
export function clampScore(value: number): number {
  return clamp(value, SCORE_MIN, SCORE_MAX);
}

/**
 * Round a raw score to the integer that gets displayed.
 *
 * Rounds *then* clamps, matching Unity's `ToDisplayClamped`. The other order
 * would let `100.4` clamp to `100` and then round to `100` — the same answer
 * here, but not for a band whose bound is not an integer.
 */
export function toDisplayScore(raw: number): number {
  return clampScore(roundHalfUp(raw));
}

/**
 * A ratio to a percentage figure: `0.467 → 46.7`.
 *
 * `null` in, `null` out. The backend's `computeEconomy` returns `null` for a
 * percentage whose revenue base is zero rather than `Infinity` or `NaN`, and a
 * dashboard that turns that into `0%` reports a healthy food cost for a service
 * that sold nothing.
 */
export function toPercent(fraction: number | null, decimals = 1): number | null {
  if (fraction === null) return null;
  if (!Number.isFinite(fraction)) return null;

  const factor = 10 ** decimals;
  return roundHalfUp(fraction * 100 * factor) / factor;
}
