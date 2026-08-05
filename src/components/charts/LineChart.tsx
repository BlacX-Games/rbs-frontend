import { curveMonotoneX } from '@visx/curve';
import { Group } from '@visx/group';
import { scaleLinear, scalePoint } from '@visx/scale';
import { Circle, Line, LinePath } from '@visx/shape';
import { useState } from 'react';
import { ChartFrame, type ChartFrameProps } from '@/components/charts/ChartFrame';
import { CategoryAxis, ChartGrid, ValueAxis } from '@/components/charts/internal/ChartAxes';
import {
  CHART_INK,
  CHART_MARGIN,
  MARK,
  domainOf,
  extentOf,
  formatNumber,
  seriesColor,
  type ChartPoint,
} from '@/components/charts/chart';

type LineChartProps = Omit<ChartFrameProps, 'children' | 'legendMark'> & {
  /** Direct-labels the final point of each series. ≤4 series only — beyond
   *  that the labels converge and leader lines or facets are the honest fix. */
  readonly directLabel?: boolean;
};

/**
 * Trend over time. One axis, always.
 *
 * A second y-scale is the single most misleading thing a chart can do: the
 * alignment between the two scales is arbitrary, so the picture invents a
 * correlation the data does not contain. Two measures of different magnitude
 * become two charts, small multiples, or both indexed to a common base.
 */
export function LineChart({ directLabel = true, ...frame }: LineChartProps) {
  const { series, formatValue = formatNumber, formatX } = frame;
  const [activeX, setActiveX] = useState<string | null>(null);

  return (
    <ChartFrame {...frame} legendMark="line">
      {({ width, innerWidth, innerHeight, showTooltip, hideTooltip }) => {
        const domain = domainOf(series);
        const xScale = scalePoint({ domain: [...domain], range: [0, innerWidth] });
        const yScale = scaleLinear({
          domain: [...extentOf(series)],
          range: [innerHeight, 0],
          nice: true,
        });

        const at = (point: ChartPoint): { x: number; y: number } => ({
          x: xScale(point.x) ?? 0,
          y: yScale(point.y),
        });

        /** The crosshair finds the X — readers aim at a date, never at a 2px line. */
        const track = (event: React.PointerEvent<SVGRectElement>): void => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const offset = event.clientX - bounds.left;
          const step = innerWidth / Math.max(domain.length - 1, 1);
          const nearest = domain[Math.min(Math.round(offset / step), domain.length - 1)];

          if (nearest === undefined) return;

          setActiveX(nearest);
          showTooltip({
            heading: formatX?.(nearest) ?? nearest,
            left: Math.min(offset + CHART_MARGIN.left + 8, width - 160),
            top: 8,
            // Every series at that X, so the pointer never has to land on a
            // line to get a value.
            rows: series.flatMap((one) => {
              const point = one.points.find((candidate) => candidate.x === nearest);

              return point === undefined
                ? []
                : [
                    {
                      key: one.key,
                      label: one.label,
                      value: formatValue(point.y),
                      slot: one.slot,
                    },
                  ];
            }),
          });
        };

        return (
          <svg height={frame.height ?? 240} role="presentation" width={width}>
            <Group left={CHART_MARGIN.left} top={CHART_MARGIN.top}>
              <ChartGrid scale={yScale} width={innerWidth} />
              <ValueAxis format={formatValue} scale={yScale} />
              <CategoryAxis
                scale={xScale}
                top={innerHeight}
                {...(formatX !== undefined && { format: formatX })}
              />

              {activeX === null ? null : (
                <Line
                  from={{ x: xScale(activeX) ?? 0, y: 0 }}
                  stroke={CHART_INK.axis}
                  strokeWidth={1}
                  to={{ x: xScale(activeX) ?? 0, y: innerHeight }}
                />
              )}

              {series.map((one) => (
                <LinePath<ChartPoint>
                  curve={curveMonotoneX}
                  data={[...one.points]}
                  key={one.key}
                  stroke={seriesColor(one.slot)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={MARK.lineWidth}
                  x={(point) => at(point).x}
                  y={(point) => at(point).y}
                />
              ))}

              {series.map((one) => {
                const last = one.points.at(-1);
                if (last === undefined) return null;

                return (
                  <Group key={one.key}>
                    {/*
                      A 2px ring in the surface colour, so end-dots stay legible
                      where two series cross. Never a stroke in the series hue —
                      that reads as a border and thickens the mark.
                    */}
                    <Circle
                      cx={at(last).x}
                      cy={at(last).y}
                      fill={seriesColor(one.slot)}
                      r={MARK.markerRadius}
                      stroke={CHART_INK.surface}
                      strokeWidth={MARK.surfaceRing}
                    />
                    {directLabel && series.length <= 4 ? (
                      // Selective by construction: the endpoint only. A value
                      // beside every point is chaos and goes unread.
                      <text
                        dx={8}
                        dy={4}
                        fill={CHART_INK.label}
                        fontFamily="var(--font-ui)"
                        fontSize={11}
                        x={at(last).x}
                        y={at(last).y}
                      >
                        {formatValue(last.y)}
                      </text>
                    ) : null}
                  </Group>
                );
              })}

              <rect
                fill="transparent"
                height={innerHeight}
                onPointerLeave={() => {
                  setActiveX(null);
                  hideTooltip();
                }}
                onPointerMove={track}
                width={innerWidth}
              />
            </Group>
          </svg>
        );
      }}
    </ChartFrame>
  );
}
