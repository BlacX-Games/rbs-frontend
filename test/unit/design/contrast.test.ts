import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../support/color';
import { darkTokens, lightTokens, token, type TokenMap } from '../../support/tokens';

/**
 * The §5.2 contrast contract, re-derived from the shipped `tokens.css`.
 *
 * §5.2 quotes its ratios without naming the backdrop each was measured against.
 * Reproducing all 19 figures to four decimal places recovered the pairing:
 *
 *   surfaces · ink · gold          → measured on --bg-canvas
 *   diverging · categorical · tier → measured on --bg-surface
 *
 * That distinction is load-bearing. Measuring the diverging scale against the
 * canvas instead of the surface shifts every figure and would quietly assert
 * the wrong contract, so the reference surface is named per case below.
 *
 * Two kinds of assertion, deliberately different in strictness:
 *   • the documented FIGURE, to ±0.01 — documentation that cannot rot
 *   • the WCAG GATE, exact — what actually protects an operator
 * A token edit that improves contrast still fails the figure assertion, which
 * is correct: §5.2 is the spec, and changing it is a decision, not a drift.
 */

const WCAG_BODY_TEXT = 4.5;
const WCAG_LARGE_TEXT_AND_UI = 3;

interface Case {
  readonly token: string;
  readonly against: string;
  readonly ratio: number;
  readonly gate: number;
}

/** Ratios quoted in §5.2 "Surfaces and ink", measured on --bg-canvas. */
const INK_CASES: Readonly<Record<'dark' | 'light', readonly Case[]>> = {
  dark: [
    { token: '--text-primary', against: '--bg-canvas', ratio: 16.85, gate: WCAG_BODY_TEXT },
    { token: '--text-secondary', against: '--bg-canvas', ratio: 7.77, gate: WCAG_BODY_TEXT },
    { token: '--text-tertiary', against: '--bg-canvas', ratio: 5.31, gate: WCAG_BODY_TEXT },
    { token: '--gold-accent', against: '--bg-canvas', ratio: 9.88, gate: WCAG_LARGE_TEXT_AND_UI },
    { token: '--gold-text', against: '--bg-canvas', ratio: 9.88, gate: WCAG_BODY_TEXT },
  ],
  light: [
    { token: '--text-primary', against: '--bg-canvas', ratio: 15.17, gate: WCAG_BODY_TEXT },
    { token: '--text-secondary', against: '--bg-canvas', ratio: 6.65, gate: WCAG_BODY_TEXT },
    { token: '--text-tertiary', against: '--bg-canvas', ratio: 5.07, gate: WCAG_BODY_TEXT },
    // The paper theme's two-gold split: accent clears UI/large only…
    { token: '--gold-accent', against: '--bg-canvas', ratio: 3.06, gate: WCAG_LARGE_TEXT_AND_UI },
    // …and gold-text is the one that may carry a body-size link.
    { token: '--gold-text', against: '--bg-canvas', ratio: 5.01, gate: WCAG_BODY_TEXT },
  ],
};

/** §5.2 "the measured finding", measured on --bg-surface. */
const POLARITY_CASES: Readonly<Record<'dark' | 'light', readonly Case[]>> = {
  dark: [
    {
      token: '--polarity-good',
      against: '--bg-surface',
      ratio: 8.03,
      gate: WCAG_LARGE_TEXT_AND_UI,
    },
    {
      token: '--polarity-neutral',
      against: '--bg-surface',
      ratio: 3.4,
      gate: WCAG_LARGE_TEXT_AND_UI,
    },
    { token: '--polarity-bad', against: '--bg-surface', ratio: 5.48, gate: WCAG_BODY_TEXT },
  ],
  light: [
    { token: '--polarity-good', against: '--bg-surface', ratio: 5.39, gate: WCAG_BODY_TEXT },
    {
      token: '--polarity-neutral',
      against: '--bg-surface',
      ratio: 3.64,
      gate: WCAG_LARGE_TEXT_AND_UI,
    },
    { token: '--polarity-bad', against: '--bg-surface', ratio: 6.4, gate: WCAG_BODY_TEXT },
  ],
};

/** The lightest step of each ordinal ramp — fill only, never text. */
const TIER_CASES: Readonly<Record<'dark' | 'light', Case>> = {
  dark: { token: '--tier-new', against: '--bg-surface', ratio: 2.2, gate: 0 },
  light: { token: '--tier-new', against: '--bg-surface', ratio: 2.19, gate: 0 },
};

const THEMES: Readonly<Record<'dark' | 'light', () => TokenMap>> = {
  dark: darkTokens,
  light: lightTokens,
};

function ratioOf(tokens: TokenMap, testCase: Case): number {
  return contrastRatio(token(tokens, testCase.token), token(tokens, testCase.against));
}

describe.each(['dark', 'light'] as const)('%s theme contrast', (theme) => {
  const tokens = THEMES[theme]();

  describe.each([...INK_CASES[theme], ...POLARITY_CASES[theme]])(
    '$token on $against',
    (testCase) => {
      it(`measures ${testCase.ratio.toFixed(2)}:1, as §5.2 documents`, () => {
        expect(ratioOf(tokens, testCase)).toBeCloseTo(testCase.ratio, 2);
      });

      it(`clears its ${testCase.gate}:1 WCAG gate`, () => {
        expect(ratioOf(tokens, testCase)).toBeGreaterThanOrEqual(testCase.gate);
      });
    },
  );

  it('documents the lightest tier step, which is a fill and carries no text', () => {
    expect(ratioOf(tokens, TIER_CASES[theme])).toBeCloseTo(TIER_CASES[theme].ratio, 2);
  });

  it('can place body text on a gold fill — see --gold-ink', () => {
    // Paper-on-gold measures 3.45:1 and would fail; near-black ink is the only
    // option that clears 4.5:1 against gold in BOTH themes.
    expect(
      contrastRatio(token(tokens, '--gold-ink'), token(tokens, '--gold-accent')),
    ).toBeGreaterThanOrEqual(WCAG_BODY_TEXT);
  });

  it('keeps every surface distinguishable from the one above it', () => {
    const surfaces = ['--bg-canvas', '--bg-surface', '--bg-raised'] as const;

    for (let i = 0; i < surfaces.length - 1; i += 1) {
      const [lower, upper] = [surfaces[i], surfaces[i + 1]] as [string, string];
      // Not a WCAG rule — a regression guard. Two surfaces that resolve to the
      // same value make every hairline-bounded card invisible.
      expect(token(tokens, lower)).not.toBe(token(tokens, upper));
    }
  });
});

describe('§5.2 relief rule', () => {
  it('flags exactly the two light slots that sit below 3:1', () => {
    const tokens = lightTokens();

    const belowGate = [1, 2, 3, 4, 5, 6, 7, 8]
      .map((slot) => `--series-${slot}`)
      .filter((name) => contrastRatio(token(tokens, name), token(tokens, '--bg-surface')) < 3);

    // §5.2 names these two and requires any chart using them to ship direct
    // labels or a table view. If a third joins them, ChartFrame's relief
    // channel needs revisiting — hence the exact assertion.
    expect(belowGate).toEqual(['--series-3', '--series-5']);
  });

  it('keeps every dark slot at or above 3:1, so dark needs no relief', () => {
    const tokens = darkTokens();

    for (const slot of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const ratio = contrastRatio(token(tokens, `--series-${slot}`), token(tokens, '--bg-surface'));
      expect(ratio, `--series-${slot}`).toBeGreaterThanOrEqual(3);
    }
  });
});
