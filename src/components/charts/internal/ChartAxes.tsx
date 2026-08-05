import { AxisBottom, AxisLeft, type AxisScale } from '@visx/axis';
import { GridRows } from '@visx/grid';
import type { ScaleLinear } from '@visx/vendor/d3-scale';
import { CHART_INK, formatNumber } from '@/components/charts/chart';

/**
 * Gridlines and axes, shared so their recessiveness is decided once.
 *
 * Hairline, SOLID, one step off the surface. Dashed rules read as "projection"
 * or "threshold" when they are just a grid, and heavy ones compete with the
 * data — the only thing allowed to be loud.
 */

const AXIS_LABEL_PROPS = {
  fill: CHART_INK.label,
  fontSize: 11,
  fontFamily: 'var(--font-ui)',
} as const;

export function ChartGrid({
  scale,
  width,
  numTicks = 4,
}: {
  readonly scale: ScaleLinear<number, number>;
  readonly width: number;
  readonly numTicks?: number;
}) {
  return (
    <GridRows
      height={0}
      numTicks={numTicks}
      scale={scale}
      stroke={CHART_INK.gridline}
      strokeWidth={1}
      width={width}
    />
  );
}

export function ValueAxis({
  scale,
  format = formatNumber,
  numTicks = 4,
}: {
  readonly scale: ScaleLinear<number, number>;
  readonly format?: (value: number) => string;
  readonly numTicks?: number;
}) {
  return (
    <AxisLeft
      hideAxisLine
      hideTicks
      numTicks={numTicks}
      scale={scale}
      tickFormat={(value) => format(Number(value))}
      // Ticks carry every value that is not directly labelled, so they are
      // rounded to clean numbers rather than to the data's own extremes.
      tickLabelProps={() => ({ ...AXIS_LABEL_PROPS, textAnchor: 'end', dx: -8, dy: 4 })}
    />
  );
}

/**
 * `AxisScale`, not `ScaleBand`, so a band scale (bars) and a point scale (lines)
 * both fit without a cast. visx's own axes are typed against exactly this — and
 * its type parameter is the scale's OUTPUT (pixels), not its domain, so it is
 * left at the default rather than pinned to `string`.
 */
export function CategoryAxis({
  scale,
  top,
  format = (value) => value,
}: {
  readonly scale: AxisScale;
  readonly top: number;
  readonly format?: (value: string) => string;
}) {
  return (
    <AxisBottom
      hideTicks
      scale={scale}
      stroke={CHART_INK.axis}
      strokeWidth={1}
      tickFormat={(value) => format(String(value))}
      tickLabelProps={() => ({ ...AXIS_LABEL_PROPS, textAnchor: 'middle', dy: 4 })}
      top={top}
    />
  );
}
