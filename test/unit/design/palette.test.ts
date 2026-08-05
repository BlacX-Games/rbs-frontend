import { describe, expect, it } from 'vitest';
import { deltaE, oklabLightness, worstDeltaEUnderCvd } from '../../support/color';
import { darkTokens, lightTokens, token, type TokenMap } from '../../support/tokens';

/**
 * The §5.2 palette gates, re-derived from the shipped `tokens.css`.
 *
 * ΔE is OKLab Euclidean distance ×100; CVD figures are the worst of the three
 * Machado severity-1.0 simulations. This implementation reproduces every ΔE
 * §5.2 publishes — 5.1, 10.4, 9.2, 27.4, 22.9, the four adjacent-pair figures,
 * and the light-theme 5.7 — so the documented numbers are asserted directly
 * rather than approximated.
 *
 * What this file deliberately does NOT assert: a blanket "gold is ≥15 from
 * every status colour". §5.2 makes no such claim, and the palette does not meet
 * it — light gold ↔ critical red collapses to CVD ΔE 5.7. §5.2 resolves that
 * with golden rule 9 (never colour alone) rather than with hue separation, and
 * the tests below pin the collision precisely so nobody later mistakes the
 * mandatory glyph for decoration.
 */

/** §5.2 all-pairs normal-vision floor. */
const NORMAL_VISION_FLOOR = 15;
/** Adjacent-slot floor under simulated CVD, which both themes clear. */
const CVD_ADJACENT_FLOOR = 8;

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function series(tokens: TokenMap): string[] {
  return SLOTS.map((slot) => token(tokens, `--series-${slot}`));
}

function adjacentPairs(values: readonly string[]): [string, string][] {
  return values.slice(0, -1).map((value, index) => [value, values[index + 1] as string]);
}

describe('categorical series — 8 slots, fixed order', () => {
  const THEMES = {
    // Figures quoted verbatim from §5.2.
    dark: { tokens: darkTokens(), worstAdjacentCvd: 8.4, worstAdjacentNormal: 19.3 },
    light: { tokens: lightTokens(), worstAdjacentCvd: 9.2, worstAdjacentNormal: 16.3 },
  } as const;

  describe.each(['dark', 'light'] as const)('%s', (theme) => {
    const { tokens, worstAdjacentCvd, worstAdjacentNormal } = THEMES[theme];
    const pairs = adjacentPairs(series(tokens));

    it('declares eight distinct slots', () => {
      expect(new Set(series(tokens)).size).toBe(8);
    });

    it(`holds worst adjacent CVD ΔE at ${worstAdjacentCvd}, as §5.2 measured`, () => {
      const worst = Math.min(...pairs.map(([a, b]) => worstDeltaEUnderCvd(a, b)));

      expect(worst).toBeCloseTo(worstAdjacentCvd, 1);
      expect(worst).toBeGreaterThanOrEqual(CVD_ADJACENT_FLOOR);
    });

    it(`holds worst adjacent normal-vision ΔE at ${worstAdjacentNormal}, as §5.2 measured`, () => {
      const worst = Math.min(...pairs.map(([a, b]) => deltaE(a, b)));

      expect(worst).toBeCloseTo(worstAdjacentNormal, 1);
      expect(worst).toBeGreaterThanOrEqual(NORMAL_VISION_FLOOR);
    });
  });
});

describe('§5.2 — amber cannot coexist with a gold brand accent', () => {
  /**
   * The measurement that removed amber from the status scale entirely. Every
   * amber candidate sits far below the floor of 15 from brand gold, which is
   * why cost %, morale, and margin take a diverging green↔gray↔red scale.
   * Hexes are the rejected candidates, so they are literals here by necessity —
   * they exist nowhere in tokens.css, which is the point.
   */
  const FINDINGS = [
    {
      pair: 'gold ↔ reference warning (dark)',
      a: '#D9B441',
      b: '#fab219',
      deltaE: 5.1,
      safe: false,
    },
    { pair: 'gold ↔ pushed orange (dark)', a: '#D9B441', b: '#EC8A3C', deltaE: 10.4, safe: false },
    { pair: 'gold ↔ orange (light)', a: '#A8841C', b: '#C2610F', deltaE: 9.2, safe: false },
    { pair: 'gold ↔ red (dark)', a: '#D9B441', b: '#d03b3b', deltaE: 27.4, safe: true },
    { pair: 'gold ↔ green (dark)', a: '#D9B441', b: '#0ca30c', deltaE: 22.9, safe: true },
  ] as const;

  it.each(FINDINGS)('$pair measures ΔE $deltaE', ({ a, b, deltaE: expected, safe }) => {
    expect(deltaE(a, b)).toBeCloseTo(expected, 1);
    // The verdict column of the §5.2 table, made executable.
    expect(deltaE(a, b) >= NORMAL_VISION_FLOOR).toBe(safe);
  });

  it('ships no amber: the dark gold token is still the one that measured 5.1 from warning', () => {
    expect(token(darkTokens(), '--gold-accent')).toBe('#d9b441');
  });
});

describe('status is reserved, and never colour alone', () => {
  it.each(['dark', 'light'] as const)('%s separates good from critical to the eye', (theme) => {
    const tokens = theme === 'dark' ? darkTokens() : lightTokens();

    expect(
      deltaE(token(tokens, '--status-good'), token(tokens, '--status-critical')),
    ).toBeGreaterThanOrEqual(NORMAL_VISION_FLOOR);
  });

  it('collapses good against critical under CVD — which is why the glyph is mandatory', () => {
    const tokens = darkTokens();
    const separation = worstDeltaEUnderCvd(
      token(tokens, '--status-good'),
      token(tokens, '--status-critical'),
    );

    // Red/green at ΔE 4.1 for a deuteranope. Golden rule 9 is not a stylistic
    // preference; without the icon and label these two are the same colour.
    expect(separation).toBeLessThan(CVD_ADJACENT_FLOOR);
  });

  it('reproduces the §5.2 light-theme note: critical red vs gold is CVD ΔE 5.7', () => {
    const tokens = lightTokens();

    expect(
      worstDeltaEUnderCvd(token(tokens, '--gold-accent'), token(tokens, '--status-critical')),
    ).toBeCloseTo(5.7, 1);
  });
});

describe('progression tiers are ordinal, not categorical', () => {
  const RAMP = ['--tier-new', '--tier-known', '--tier-popular', '--tier-beloved'] as const;

  it.each([
    { theme: 'dark', tokens: darkTokens, direction: 'lighten' },
    { theme: 'light', tokens: lightTokens, direction: 'darken' },
  ])('$theme ramps monotonically ($direction) through New → Beloved', ({ tokens, direction }) => {
    const lightness = RAMP.map((name) => oklabLightness(token(tokens(), name)));

    // One hue, monotone lightness — so the ORDER is visible in the colour
    // itself, which a categorical palette could never convey.
    for (let i = 0; i < lightness.length - 1; i += 1) {
      const [current, next] = [lightness[i] as number, lightness[i + 1] as number];

      if (direction === 'lighten') expect(next).toBeGreaterThan(current);
      else expect(next).toBeLessThan(current);
    }
  });
});

describe('polarity replaces amber with a diverging scale', () => {
  it.each(['dark', 'light'] as const)('%s puts the neutral midpoint between the poles', (theme) => {
    const tokens = theme === 'dark' ? darkTokens() : lightTokens();
    const [good, neutral, bad] = (
      ['--polarity-good', '--polarity-neutral', '--polarity-bad'] as const
    ).map((name) => token(tokens, name)) as [string, string, string];

    // A diverging scale is only readable if the midpoint is genuinely between
    // the poles rather than a third categorical hue near one of them.
    expect(deltaE(good, bad)).toBeGreaterThan(deltaE(good, neutral));
    expect(deltaE(good, bad)).toBeGreaterThan(deltaE(neutral, bad));
  });
});
