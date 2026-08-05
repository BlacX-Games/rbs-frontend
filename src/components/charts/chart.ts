/**
 * The contracts every chart shares.
 *
 * ── No colour array exists in JavaScript ──────────────────────────────────────
 * `seriesColor` returns the STRING `var(--series-3)`, never a hex. SVG
 * presentation attributes accept `var()`, so a chart re-themes with the page and
 * there is nothing in JS to drift out of step with `tokens.css`. That was
 * decided in stage 1 and it is what makes the "no hex outside tokens.css" rule
 * survive contact with charting.
 */

/**
 * 1-based, matching `--series-N`.
 *
 * A slot is assigned by the CALLER and belongs to the entity, never to its
 * position in the array. Colouring by array index means a filter that removes
 * one series repaints the survivors, and a reader who learned "Barbecue is
 * blue" is then misled.
 */
export type SeriesSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const SERIES_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function seriesColor(slot: SeriesSlot): string {
  return `var(--series-${String(slot)})`;
}

/** Chart chrome, as token references rather than values. */
export const CHART_INK = {
  gridline: 'var(--chart-gridline)',
  axis: 'var(--chart-axis)',
  label: 'var(--chart-label)',
  /** The colour the two spacers paint in — see MARK below. */
  surface: 'var(--bg-surface)',
  gold: 'var(--gold-accent)',
} as const;

/**
 * Mark specs, fixed across every chart (§5.5, and the same numbers the
 * visualization method prescribes).
 *
 * `surfaceGap` and `surfaceRing` are the two spacers, and they are the ONLY
 * mechanism allowed to separate touching marks. A stroke drawn around a mark
 * adds ink that is not data — it reads as a border and thickens the chart.
 */
export const MARK = {
  /** Lines: 2px, round join and cap. */
  lineWidth: 2,
  /** Markers ≥ 8px across, so r ≥ 4. */
  markerRadius: 4,
  /** A 2px ring in the surface colour keeps overlapping dots legible. */
  surfaceRing: 2,
  /** Bars are capped, never filling their band — the leftover is air. */
  barMaxThickness: 24,
  /** Rounded at the data end, square at the baseline. */
  barRadius: 4,
  /** Between stacked segments and between adjacent bars alike. */
  surfaceGap: 2,
  /** Area fills are a wash, never a saturated block. */
  areaOpacity: 0.1,
} as const;

export const CHART_MARGIN = { top: 16, right: 16, bottom: 32, left: 48 } as const;

/**
 * One observation.
 *
 * `x` is a string — a category name or an ISO date — because it is a domain
 * KEY, and keys that cross the wire are strings. `y` is a number because pixel
 * geometry needs one.
 *
 * Charting money means turning a decimal string into a number to position a
 * pixel, which is fine and unavoidable: it is display geometry, not arithmetic.
 * What must not happen is the DISPLAYED figure coming from that number — every
 * value a reader sees goes through `formatValue`, which the caller drives from
 * the original string. Golden rule 10 holds because no total is ever computed
 * from these.
 */
export interface ChartPoint {
  readonly x: string;
  readonly y: number;
}

export interface ChartSeries {
  readonly key: string;
  readonly label: string;
  readonly slot: SeriesSlot;
  readonly points: readonly ChartPoint[];
}

/** Every distinct `x` across every series, in first-seen order. */
export function domainOf(series: readonly ChartSeries[]): readonly string[] {
  const seen = new Set<string>();

  for (const one of series) {
    for (const point of one.points) seen.add(point.x);
  }

  return [...seen];
}

/**
 * `[min, max]` across every series, always including zero.
 *
 * Bars grow from a single baseline and a truncated one exaggerates every
 * difference — the most common way a chart lies without anyone deciding to.
 */
export function extentOf(series: readonly ChartSeries[]): readonly [number, number] {
  const values = series.flatMap((one) => one.points.map((point) => point.y));

  return [Math.min(0, ...values), Math.max(0, ...values)];
}

/** Default number formatting — thousands-separated, no forced decimals. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value);
}
