import { describe, expect, it } from 'vitest';
import { isHex } from '../../support/color';
import {
  darkTokens,
  lightMediaTokens,
  lightTokens,
  tokensForSelector,
  type TokenMap,
} from '../../support/tokens';

/**
 * Structural invariants of `tokens.css` — the things no contrast or ΔE gate
 * would catch.
 *
 * A token that exists in one theme and not the other does not fail a contrast
 * check; it fails silently at runtime as an unresolved `var()`, which paints
 * transparent or inherits. These are the cheapest bugs to prevent and the most
 * annoying to diagnose from a screenshot.
 */

function names(tokens: TokenMap): string[] {
  return [...tokens.keys()].sort();
}

describe('theme completeness', () => {
  it('declares the same token names in both themes', () => {
    // An unresolved var() paints transparent rather than throwing, so a token
    // present in only one theme is invisible until someone opens that theme.
    expect(names(lightTokens())).toEqual(names(darkTokens()));
  });

  it('gives every token a non-empty value', () => {
    for (const [theme, tokens] of [
      ['dark', darkTokens()],
      ['light', lightTokens()],
    ] as const) {
      for (const [name, value] of tokens) {
        expect(value, `${theme} ${name}`).not.toBe('');
      }
    }
  });

  it('keeps the light OS-fallback block identical to [data-theme="light"]', () => {
    // Pure CSS cannot share the two blocks — one is an attribute rule, the
    // other lives inside a media query — so the duplication is enforced here.
    // Editing one and forgetting the other is the exact failure this catches.
    expect(Object.fromEntries(lightMediaTokens())).toEqual(Object.fromEntries(lightTokens()));
  });
});

describe('the palette tokens §5.2 requires', () => {
  const REQUIRED = [
    '--bg-canvas',
    '--bg-surface',
    '--bg-raised',
    '--bg-overlay',
    '--border-subtle',
    '--border-default',
    '--border-strong',
    '--text-primary',
    '--text-secondary',
    '--text-tertiary',
    '--gold-accent',
    '--gold-text',
    '--gold-ink',
    '--danger-ink',
    '--control-edge',
    '--polarity-good',
    '--polarity-neutral',
    '--polarity-bad',
    '--status-good',
    '--status-critical',
    '--tier-new',
    '--tier-known',
    '--tier-popular',
    '--tier-beloved',
    '--chart-gridline',
    '--chart-axis',
    '--chart-label',
    '--elevation-1',
    '--elevation-2',
    '--elevation-3',
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => `--series-${slot}`),
  ];

  it.each(REQUIRED)('%s exists in both themes', (name) => {
    expect(darkTokens().has(name), 'dark').toBe(true);
    expect(lightTokens().has(name), 'light').toBe(true);
  });

  it('keeps every colour the gates measure as an opaque hex', () => {
    // The contrast and ΔE maths cannot compose an alpha channel against an
    // unknown backdrop. Hairlines and chart chrome are deliberately rgba() and
    // are excluded from measurement, so they are excluded here too.
    const measured = REQUIRED.filter(
      (name) =>
        !name.startsWith('--border-') &&
        !name.startsWith('--chart-') &&
        !name.startsWith('--elevation-'),
    );

    for (const [theme, tokens] of [
      ['dark', darkTokens()],
      ['light', lightTokens()],
    ] as const) {
      for (const name of measured) {
        expect(isHex(tokens.get(name) ?? ''), `${theme} ${name}`).toBe(true);
      }
    }
  });
});

describe('density', () => {
  const comfortable = () => tokensForSelector("[data-density='comfortable']");
  const compact = () => tokensForSelector("[data-density='compact']");

  it('declares the same knobs at both densities', () => {
    expect(names(compact())).toEqual(names(comfortable()));
  });

  it('meets the 44px tap-target floor in comfortable', () => {
    // §5.6 and the GDD both put the minimum at 44×44, which makes comfortable
    // the accessible mode rather than merely the roomier one.
    //
    // This only asserts the TOKEN. Whether a control actually renders 44px tall
    // is unobservable here — `css: false` means jsdom loads no stylesheet — so
    // e2e/design.matrix.spec.ts measures real boxes with boundingBox(). Note
    // that axe cannot cover the gap either: WCAG 2.2 SC 2.5.8 sets the AA floor
    // at 24×24, and 44×44 is SC 2.5.5, which is AAA.
    expect(comfortable().get('--row-h')).toBe('44px');
    expect(comfortable().get('--control-h')).toBe('44px');
  });

  it('is genuinely denser in compact', () => {
    const [roomy, tight] = [comfortable().get('--row-h'), compact().get('--row-h')];

    expect(Number.parseInt(tight ?? '', 10)).toBeLessThan(Number.parseInt(roomy ?? '', 10));
  });
});

describe('motion', () => {
  it('collapses every duration to 1ms under prefers-reduced-motion', () => {
    const reduced = tokensForSelector(':root', '@media (prefers-reduced-motion: reduce)');

    // §5.4 is explicit: all durations collapse to 1ms. A token left at its
    // full duration is a vestibular-trigger bug that no visual test catches.
    for (const name of ['--motion-fast', '--motion-base', '--motion-slow']) {
      expect(reduced.get(name), name).toBe('1ms');
    }
  });
});
