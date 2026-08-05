import { describe, expect, it } from 'vitest';
import {
  addMoney,
  compareMoney,
  formatDecimal,
  formatMoney,
  fromMinorUnits,
  isNegativeMoney,
  isZeroMoney,
  multiplyMoney,
  normalizeMoney,
  subtractMoney,
  sumMoney,
  toMinorUnits,
} from '@/lib/money';

/**
 * Golden rule 10 under test.
 *
 * The cases that matter are the ones a `parseFloat` implementation would pass
 * anyway — most of them. The ones it cannot pass are `3 × 19.99` and the
 * magnitudes past `Number.MAX_SAFE_INTEGER`, and those are the point.
 */

describe('the wire form', () => {
  it('accepts the unpadded strings Prisma actually sends', () => {
    // Verified against the installed @prisma/client runtime: `Decimal.toJSON`
    // is decimal.js `toString`, which normalizes to significant digits, not to
    // the column's declared scale. A $18.00 dish price arrives as "18".
    expect(toMinorUnits('18')).toBe(1800n);
    expect(toMinorUnits('5.4')).toBe(540n);
    expect(toMinorUnits('30')).toBe(3000n);
  });

  it('re-pads to the canonical form', () => {
    expect(normalizeMoney('18')).toBe('18.00');
    expect(normalizeMoney('5.4')).toBe('5.40');
    expect(normalizeMoney('-2310')).toBe('-2310.00');
    expect(normalizeMoney('0')).toBe('0.00');
  });

  it('round-trips through minor units', () => {
    for (const value of ['0.00', '0.01', '18.00', '-0.01', '-2310.50', '999999999.99']) {
      expect(fromMinorUnits(toMinorUnits(value))).toBe(value);
    }
  });

  it('rejects a value carrying more precision than the column holds', () => {
    // `Decimal(12,2)` cannot store this. Rounding it silently is how a total
    // stops reconciling against the database by a cent nobody can find.
    expect(() => toMinorUnits('18.005')).toThrow(RangeError);
  });

  it('rejects things that are not decimals', () => {
    for (const value of ['', '18.00 USD', '$18.00', '1e3', '1,800.00', 'NaN', '--1']) {
      expect(() => toMinorUnits(value), value).toThrow(TypeError);
    }
  });
});

describe('arithmetic', () => {
  it('pins the Unity EconomyTests case', () => {
    // §10 asks for `3 × 19.99 = 59.97` specifically, because the Unity harness
    // asserts it with C# `decimal`. Worth knowing: this particular product IS
    // exact in IEEE-754 — `3 * 19.99 === 59.97` — so it pins the contract
    // without demonstrating the hazard. The next test does that.
    expect(multiplyMoney('19.99', 3)).toBe('59.97');
  });

  it('multiplies exactly where a float cannot', () => {
    // Same price, seven covers instead of three: `19.99 * 7` is
    // 139.92999999999998, which formats to "$139.93" and compares unequal to
    // 139.93. The bug survives every visual check and fails the one reconcile
    // that matters.
    expect(multiplyMoney('19.99', 7)).toBe('139.93');
    expect(19.99 * 7).not.toBe(139.93);

    // And a cover count large enough to drift the other way.
    expect(multiplyMoney('4.35', 100)).toBe('435.00');
    expect(4.35 * 100).not.toBe(435);
  });

  it('adds exactly where a float cannot', () => {
    expect(addMoney('0.1', '0.2')).toBe('0.30');
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it('refuses a fractional factor rather than inventing a rounding rule', () => {
    // No document in any of the three repos states a rounding convention for
    // money. Guessing one here would put a half-cent policy in the console that
    // the sim never agreed to.
    expect(() => multiplyMoney('19.99', 0.5)).toThrow(TypeError);
  });

  it('subtracts across zero', () => {
    expect(subtractMoney('18.00', '20.50')).toBe('-2.50');
    expect(subtractMoney('18.00', '18.00')).toBe('0.00');
  });

  it('sums a column', () => {
    expect(sumMoney(['480.00', '180.00', '320.00'])).toBe('980.00');
    // An empty column totals zero, not NaN and not "".
    expect(sumMoney([])).toBe('0.00');
  });

  it('stays exact past Number.MAX_SAFE_INTEGER', () => {
    // `Decimal(12,2)` tops out below this, but `totalRevenue` sums across every
    // service a restaurant ever ran, and an Insights aggregate sums across
    // every restaurant. bigint has no ceiling to discover in production.
    const huge = '90071992547409.93';
    expect(addMoney(huge, '0.01')).toBe('90071992547409.94');
    expect(Number(huge) + 0.01).not.toBe(90071992547409.94);
  });
});

describe('predicates', () => {
  it('sorts numerically, not lexically', () => {
    // "9.00" > "18.00" as strings. A money column sorted that way puts nine
    // dollars above eighteen, which reads as plausible data.
    const sorted = ['18.00', '9.00', '-2.50', '100.00'].sort((a, b) => compareMoney(a, b));
    expect(sorted).toEqual(['-2.50', '9.00', '18.00', '100.00']);
  });

  it('identifies sign and zero across both wire forms', () => {
    expect(isNegativeMoney('-0.01')).toBe(true);
    expect(isNegativeMoney('0')).toBe(false);
    expect(isZeroMoney('0')).toBe(true);
    expect(isZeroMoney('0.00')).toBe(true);
    expect(isZeroMoney('-0.00')).toBe(true);
  });
});

describe('formatting', () => {
  it('formats the wire form as currency', () => {
    expect(formatMoney('18')).toBe('$18.00');
    expect(formatMoney('1840')).toBe('$1,840.00');
    expect(formatMoney('5.4')).toBe('$5.40');
  });

  it('uses a true minus, not a hyphen', () => {
    // §5.3 pairs tabular figures with U+2212: the hyphen is narrower than a
    // digit, so a column of negatives sits out of alignment with the positives.
    expect(formatMoney('-2310.5')).toBe('−$2,310.50');
    expect(formatMoney('-2310.5')).not.toContain('-');
    expect(formatMoney('-2310.5', { asciiMinus: true })).toBe('-$2,310.50');
  });

  it('drops the symbol on request', () => {
    expect(formatMoney('1840', { bare: true })).toBe('1,840.00');
  });

  it('formats a non-currency decimal exactly', () => {
    // Dish.averageRating is Decimal(3,2) and arrives as "4.5", not "4.50".
    expect(formatDecimal('4.5', { minimumFractionDigits: 1 })).toBe('4.5');
    expect(formatDecimal('30')).toBe('30');
  });

  it('never routes a value through a float on the way to Intl', () => {
    // The regression guard for the one-character mistake that undoes this
    // module: `Intl.NumberFormat.format` accepts strings and formats them
    // exactly, so a value beyond 2^53 survives. `Number(value)` would not.
    expect(formatMoney('9007199254740993.01')).toBe('$9,007,199,254,740,993.01');
  });
});
