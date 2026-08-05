import { curveMonotoneX } from '@visx/curve';
import { scaleLinear, scalePoint } from '@visx/scale';
import { Circle, LinePath } from '@visx/shape';
import {
  CHART_INK,
  MARK,
  seriesColor,
  type ChartPoint,
  type SeriesSlot,
} from '@/components/charts/chart';
import { cn } from '@/lib/cn';

export type SparklineProps = {
  readonly points: readonly ChartPoint[];
  /**
   * Names the trend for assistive tech, because the shape carries no text at
   * all — "Covers, last 12 services".
   */
  readonly label: string;
  /** A short spoken summary: "up 12% over 12 services". */
  readonly summary: string;
  readonly slot?: SeriesSlot;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
};

/**
 * The 12-point trend that rides inside a StatTile.
 *
 * Deliberately NOT a ChartFrame chart: it has no axes, no legend, no tooltip and
 * no table toggle, because it is a texture rather than a readout. That is only
 * legal because it never carries a value of its own — the tile's figure is the
 * number, and this shows the shape of getting there. A sparkline presented as
 * the sole source of a value would gate that value behind pixel-reading.
 *
 * `role="img"` with a spoken summary is the whole accessibility contract: the
 * alternative — forty-two `<td>`s for a decoration — is worse for everyone.
 */
export function Sparkline({
  points,
  label,
  summary,
  slot = 4,
  width = 96,
  height = 24,
  className,
}: SparklineProps) {
  if (points.length < 2) return null;

  const xScale = scalePoint({
    domain: points.map((point) => point.x),
    range: [MARK.markerRadius, width - MARK.markerRadius],
  });
  const values = points.map((point) => point.y);
  const yScale = scaleLinear({
    domain: [Math.min(...values), Math.max(...values)],
    range: [height - MARK.markerRadius, MARK.markerRadius],
  });

  const last = points.at(-1);

  return (
    <svg
      aria-label={`${label}: ${summary}`}
      className={cn('shrink-0', className)}
      height={height}
      role="img"
      width={width}
    >
      <LinePath<ChartPoint>
        curve={curveMonotoneX}
        data={[...points]}
        stroke={seriesColor(slot)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={MARK.lineWidth}
        x={(point) => xScale(point.x) ?? 0}
        y={(point) => yScale(point.y)}
      />

      {last === undefined ? null : (
        // Only the current period is marked. The whole line in the accent with
        // a dot on every point would make twelve equal claims where there is
        // one — where the value is now.
        <Circle
          cx={xScale(last.x) ?? 0}
          cy={yScale(last.y)}
          fill={seriesColor(slot)}
          r={MARK.markerRadius - 1}
          stroke={CHART_INK.surface}
          strokeWidth={MARK.surfaceRing}
        />
      )}
    </svg>
  );
}
