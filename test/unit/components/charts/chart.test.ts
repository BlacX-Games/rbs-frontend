import { describe, expect, it } from 'vitest';
import {
  MARK,
  SERIES_SLOTS,
  domainOf,
  extentOf,
  formatNumber,
  seriesColor,
  type ChartSeries,
} from '@/components/charts/chart';

/**
 * The chart layer's own invariants.
 *
 * These are the rules §5.2 and the visualization method state as
 * non-negotiable, asserted where they are cheapest to check — in the data
 * helpers, before any pixel exists.
 */

describe('seriesColor', () => {
  it('returns a token reference, never a colour value', () => {
    // The whole reason charts re-theme without JavaScript. A hex here would put
    // a second source of truth beside tokens.css and it would drift.
    expect(seriesColor(3)).toBe('var(--series-3)');
  });

  it('covers exactly the eight slots the palette defines', () => {
    // Eight is the token ceiling. A ninth generated hue is indistinguishable
    // from an existing slot under CVD, which is why the type has no ninth
    // member and this asserts the array agrees with it.
    expect(SERIES_SLOTS).toHaveLength(8);
    expect(SERIES_SLOTS.map(seriesColor)).toEqual([
      'var(--series-1)',
      'var(--series-2)',
      'var(--series-3)',
      'var(--series-4)',
      'var(--series-5)',
      'var(--series-6)',
      'var(--series-7)',
      'var(--series-8)',
    ]);
  });
});

describe('extentOf', () => {
  const series = (points: readonly (readonly [string, number])[]): ChartSeries => ({
    key: 'k',
    label: 'l',
    slot: 1,
    points: points.map(([x, y]) => ({ x, y })),
  });

  it('always includes zero, so no baseline is ever truncated', () => {
    // A cropped baseline exaggerates every difference in the chart without
    // anyone deciding to — the most common way a chart misleads by accident.
    expect(
      extentOf([
        series([
          ['a', 100],
          ['b', 110],
        ]),
      ]),
    ).toEqual([0, 110]);
  });

  it('spans negatives, which reputation change genuinely has', () => {
    // ServiceSession.reputationChange is signed, so this is a live case rather
    // than a theoretical one.
    expect(
      extentOf([
        series([
          ['a', -12],
          ['b', 8],
        ]),
      ]),
    ).toEqual([-12, 8]);
  });

  it('reaches across every series, not just the first', () => {
    expect(extentOf([series([['a', 5]]), series([['a', 40]])])).toEqual([0, 40]);
  });
});

describe('domainOf', () => {
  it('keeps first-seen order and de-duplicates across series', () => {
    const a: ChartSeries = {
      key: 'a',
      label: 'A',
      slot: 1,
      points: [
        { x: 'Mon', y: 1 },
        { x: 'Tue', y: 2 },
      ],
    };
    const b: ChartSeries = {
      key: 'b',
      label: 'B',
      slot: 2,
      points: [
        { x: 'Tue', y: 3 },
        { x: 'Wed', y: 4 },
      ],
    };

    // Order is the domain's meaning for a time axis; sorting it would reorder
    // the reader's week.
    expect(domainOf([a, b])).toEqual(['Mon', 'Tue', 'Wed']);
  });
});

describe('MARK', () => {
  it('pins the specs every chart shares', () => {
    // Asserted rather than trusted because they are spread across nine files
    // and drift one at a time. §5.5 and the visualization method agree on all
    // of these numbers.
    expect(MARK).toMatchObject({
      lineWidth: 2,
      markerRadius: 4,
      surfaceRing: 2,
      barMaxThickness: 24,
      barRadius: 4,
      surfaceGap: 2,
      areaOpacity: 0.1,
    });
  });

  it('keeps markers at or above 8px across', () => {
    expect(MARK.markerRadius * 2).toBeGreaterThanOrEqual(8);
  });
});

describe('formatNumber', () => {
  it('groups thousands and does not force decimals', () => {
    expect(formatNumber(1840)).toBe('1,840');
    expect(formatNumber(46.7)).toBe('46.7');
  });
});
