/**
 * Deterministic pseudo-randomness for the fixtures.
 *
 * ── Why not `Math.random` ───────────────────────────────────────────────────
 * §7.3 requires a fixed seed. A mock dataset that changes per reload makes
 * every visual snapshot flap, every "reproduce the bug" impossible, and every
 * screenshot in a review a different set of numbers. The demo has to be the
 * same demo twice.
 *
 * `Date.now()` is excluded for the same reason — see `FIXTURE_NOW`.
 *
 * ── The generator ──────────────────────────────────────────────────────────
 * A 32-bit linear congruential generator with Numerical Recipes' constants. It
 * is a poor PRNG and an excellent fixture generator: tiny, dependency-free,
 * and identical in every JS engine, which is what "deterministic" has to mean
 * across a dev machine and a CI runner.
 */
export interface Random {
  /** `[0, 1)`. */
  next(): number;
  /** Integer in `[min, max]`, inclusive at both ends. */
  int(min: number, max: number): number;
  /** An element. Throws on an empty array rather than returning `undefined`. */
  pick<T>(values: readonly T[]): T;
  /** `n` distinct elements, in the source array's order. */
  sample<T>(values: readonly T[], n: number): readonly T[];
  bool(probability: number): boolean;
  /** A decimal string with `scale` places — the wire form for money. */
  decimal(min: number, max: number, scale?: number): string;
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = (): number => {
    // `Math.imul` keeps the multiply in 32-bit space; a plain `*` overflows
    // into float territory and the sequence stops being reproducible.
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };

  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));

  const pick = <T>(values: readonly T[]): T => {
    const value = values[int(0, values.length - 1)];
    if (value === undefined) throw new Error('Random.pick received an empty array');
    return value;
  };

  return {
    next,
    int,
    pick,

    sample<T>(values: readonly T[], n: number): readonly T[] {
      // Order-preserving, so a sampled tag list reads in the order it was
      // authored rather than shuffled — which would make two fixtures that hold
      // the same tags look like different data.
      const wanted = Math.min(n, values.length);
      const chosen = new Set<number>();

      while (chosen.size < wanted) chosen.add(int(0, values.length - 1));

      return values.filter((_, index) => chosen.has(index));
    },

    bool: (probability: number): boolean => next() < probability,

    decimal(min: number, max: number, scale = 2): string {
      const factor = 10 ** scale;
      const units = int(Math.round(min * factor), Math.round(max * factor));

      // Built as a string, never via `toFixed` on a float: the fixtures are the
      // thing `lib/money.ts` is tested against, and generating them through the
      // arithmetic that module exists to avoid would make the test agree with
      // the bug.
      const whole = Math.trunc(units / factor);
      const fraction = Math.abs(units % factor);

      return scale === 0
        ? String(whole)
        : `${String(whole)}.${String(fraction).padStart(scale, '0')}`;
    },
  };
}

/**
 * Strips trailing zeros, exactly as Prisma's `Decimal.toJSON` does.
 *
 * The single most important line in the mock network. `decimal.js` normalizes
 * to significant digits rather than to the column's scale, so a real backend
 * sends `"18"` for an $18.00 price and `"5.4"` for $5.40. Fixtures that stored
 * `"18.00"` would be a mock that is easier to consume than the thing it stands
 * in for — and every `formatMoney` call would look correct right up until the
 * day it met real data.
 */
export function asWireDecimal(value: string): string {
  if (!value.includes('.')) return value;

  const trimmed = value.replace(/0+$/, '').replace(/\.$/, '');
  return trimmed === '' || trimmed === '-' ? '0' : trimmed;
}

/**
 * Deterministic UUIDs, shaped like the v7 values `schema.prisma` mints.
 *
 * `kind` namespaces an entity type so a player and a restaurant at the same
 * index cannot collide. The version nibble is `7` and the variant nibble is `a`
 * so `z.uuid()` — and anything downstream that inspects them — sees a
 * well-formed identifier rather than a fixture that only works here.
 */
export function fixtureId(kind: number, index: number): string {
  const hex = (value: number, width: number): string =>
    (value >>> 0).toString(16).padStart(width, '0').slice(-width);

  return [
    hex(kind * 0x0100_0000 + index, 8),
    hex(index, 4),
    `7${hex(index % 0x1000, 3)}`,
    `a${hex((kind * 7 + index) % 0x1000, 3)}`,
    `${hex(kind, 4)}${hex(index, 8)}`,
  ].join('-');
}

/**
 * The instant the fixture universe is frozen at.
 *
 * Every timestamp is derived from this rather than from `Date.now()`, so the
 * dataset is byte-identical on every run — which is what lets a snapshot, a
 * test, and a screenshot all describe the same demo. The visible cost is that
 * "today" in mock mode is always this day; §6.4 already requires every
 * aggregate to carry an explicit "as of" stamp, so it says so on screen.
 */
export const FIXTURE_NOW = Date.parse('2026-08-05T12:00:00.000Z');

const DAY = 86_400_000;

/** An ISO timestamp `days` before the frozen now, offset by `minutes`. */
export function daysAgo(days: number, minutes = 0): string {
  return new Date(FIXTURE_NOW - days * DAY + minutes * 60_000).toISOString();
}
