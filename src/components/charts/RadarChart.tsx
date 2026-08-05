import { Group } from '@visx/group';
import { Circle, Line, Polygon } from '@visx/shape';
import { ChartFrame, type ChartFrameProps } from '@/components/charts/ChartFrame';
import {
  CHART_INK,
  MARK,
  formatNumber,
  seriesColor,
  type ChartSeries,
} from '@/components/charts/chart';

/**
 * A profile across fixed axes — the ten `FlavorDimension`s, in canonical order.
 *
 * Radar is the right form for exactly one job: comparing a handful of entities
 * across the SAME small set of named dimensions, where the shape itself is the
 * comparison. It is the wrong form for anything else — the enclosed area grows
 * with the square of the values and so overstates differences, and the reading
 * depends on axis order, which is why the order here is canonical and fixed
 * rather than derived from whatever the data arrived in.
 *
 * Capped at THREE series. This is an all-pairs form: every series is compared
 * against every other, and §5.2 measured that beyond three slots no eight-hue
 * ordering clears the all-pairs ΔE floor. Past three, facet into SmallMultiples.
 */
const MAX_SERIES = 3;

export function RadarChart({
  axes,
  max = 100,
  ...frame
}: Omit<ChartFrameProps, 'children' | 'legendMark'> & {
  /** In canonical order. The reading depends on it, so it is never sorted. */
  readonly axes: readonly string[];
  readonly max?: number;
}) {
  const { series, formatValue = formatNumber } = frame;
  const shown = series.slice(0, MAX_SERIES);

  return (
    <ChartFrame {...frame} legendMark="line" series={shown}>
      {({ width, height }) => {
        const size = Math.min(width, height);
        const radius = size / 2 - 24;
        const centre = { x: width / 2, y: height / 2 };

        const pointAt = (index: number, value: number): { x: number; y: number } => {
          // Starts at twelve o'clock and runs clockwise, which is how a reader
          // expects to trace a dial.
          const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
          const distance = (Math.min(Math.max(value, 0), max) / max) * radius;

          return {
            x: centre.x + Math.cos(angle) * distance,
            y: centre.y + Math.sin(angle) * distance,
          };
        };

        const valueOn = (one: ChartSeries, axis: string): number =>
          one.points.find((point) => point.x === axis)?.y ?? 0;

        return (
          <svg height={height} role="presentation" width={width}>
            {/* Rings and spokes are the grid — hairline, solid, recessive. */}
            {[0.25, 0.5, 0.75, 1].map((step) => (
              <Polygon
                key={step}
                points={axes.map((_, index) => {
                  const at = pointAt(index, max * step);
                  return [at.x, at.y] as [number, number];
                })}
                stroke={CHART_INK.gridline}
                strokeWidth={1}
              />
            ))}

            {axes.map((axis, index) => (
              <Line
                from={centre}
                key={axis}
                stroke={CHART_INK.gridline}
                strokeWidth={1}
                to={pointAt(index, max)}
              />
            ))}

            {axes.map((axis, index) => {
              const at = pointAt(index, max * 1.16);

              return (
                <text
                  dominantBaseline="middle"
                  fill={CHART_INK.label}
                  fontFamily="var(--font-ui)"
                  fontSize={11}
                  key={axis}
                  textAnchor="middle"
                  x={at.x}
                  y={at.y}
                >
                  {axis}
                </text>
              );
            })}

            {shown.map((one) => (
              <Group key={one.key}>
                <Polygon
                  fill={seriesColor(one.slot)}
                  fillOpacity={MARK.areaOpacity}
                  points={axes.map((axis, index) => {
                    const at = pointAt(index, valueOn(one, axis));
                    return [at.x, at.y] as [number, number];
                  })}
                  stroke={seriesColor(one.slot)}
                  strokeWidth={MARK.lineWidth}
                />
                {axes.map((axis, index) => {
                  const at = pointAt(index, valueOn(one, axis));

                  return (
                    <Circle
                      cx={at.x}
                      cy={at.y}
                      fill={seriesColor(one.slot)}
                      key={axis}
                      r={MARK.markerRadius}
                      stroke={CHART_INK.surface}
                      strokeWidth={MARK.surfaceRing}
                    >
                      <title>{`${one.label} · ${axis}: ${formatValue(valueOn(one, axis))}`}</title>
                    </Circle>
                  );
                })}
              </Group>
            ))}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
