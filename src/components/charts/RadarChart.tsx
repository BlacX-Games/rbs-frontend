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

/**
 * The square the radar is drawn in, in its OWN coordinates.
 *
 * Geometry is deliberately independent of the measured pixel width. It used to
 * be `Math.min(width, height)` with the centre at `width / 2`, which made every
 * vertex a function of however wide the container happened to settle — and
 * inside FlavorProfileEditor, where the chart is a `flex-1` sibling of a
 * ten-field fieldset, that landed a pixel or two apart between renders. The
 * visual-regression suite caught it as 38,477 differing pixels in an image of
 * otherwise identical dimensions.
 *
 * A radar is a fixed-aspect diagram, so the honest model is to draw it once at
 * a known size and let `viewBox` scale it. `SmallMultiples` already does this.
 *
 * The other charts deliberately do NOT: axis tick spacing and label collision
 * are pixel decisions, and a viewBox would scale their type along with the
 * marks.
 */
const BOX = 280;
const PADDING = 24;

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
      {({ height }) => {
        const radius = BOX / 2 - PADDING;
        const centre = { x: BOX / 2, y: BOX / 2 };

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
          <svg
            height={height}
            // `meet` scales the square to fit and centres it, so a wider
            // container adds air rather than moving a single vertex.
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
            viewBox={`0 0 ${String(BOX)} ${String(BOX)}`}
            width="100%"
          >
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
