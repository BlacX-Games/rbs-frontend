import { curveMonotoneX } from '@visx/curve';
import { Group } from '@visx/group';
import { scaleLinear, scalePoint } from '@visx/scale';
import { AreaClosed, Circle, LinePath } from '@visx/shape';
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

/**
 * A single series over time, with the area as emphasis rather than as weight.
 *
 * The fill is the series hue at 10% — a wash, never a saturated block. Stacking
 * several translucent areas turns overlap into a colour nobody assigned, so this
 * takes exactly one series; two or more is a LineChart, and part-to-whole is a
 * StackedBar.
 */
export function AreaChart(frame: Omit<ChartFrameProps, 'children' | 'legendMark'>) {
  const { series, formatValue = formatNumber, formatX } = frame;
  const one = series.at(0);

  return (
    <ChartFrame {...frame} legendMark="rect">
      {({ width, innerWidth, innerHeight, showTooltip, hideTooltip }) => {
        if (one === undefined) return null;

        const domain = domainOf(series);
        const xScale = scalePoint({ domain: [...domain], range: [0, innerWidth] });
        const yScale = scaleLinear({
          domain: [...extentOf(series)],
          range: [innerHeight, 0],
          nice: true,
        });

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

              <AreaClosed<ChartPoint>
                curve={curveMonotoneX}
                data={[...one.points]}
                fill={seriesColor(one.slot)}
                fillOpacity={MARK.areaOpacity}
                x={(point) => xScale(point.x) ?? 0}
                y={(point) => yScale(point.y)}
                yScale={yScale}
              />

              {/* The line rides the top of the wash — the fill alone has no
                  crisp edge to read a value against. */}
              <LinePath<ChartPoint>
                curve={curveMonotoneX}
                data={[...one.points]}
                stroke={seriesColor(one.slot)}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={MARK.lineWidth}
                x={(point) => xScale(point.x) ?? 0}
                y={(point) => yScale(point.y)}
              />

              {one.points.map((point) => (
                <Circle
                  cx={xScale(point.x) ?? 0}
                  cy={yScale(point.y)}
                  fill={seriesColor(one.slot)}
                  key={point.x}
                  // The painted dot is 8px; the hit area below is 24px, because
                  // an 8px target is a pinpoint nobody lands on reliably.
                  r={MARK.markerRadius}
                  stroke={CHART_INK.surface}
                  strokeWidth={MARK.surfaceRing}
                />
              ))}

              {one.points.map((point) => (
                <circle
                  cx={xScale(point.x) ?? 0}
                  cy={yScale(point.y)}
                  fill="transparent"
                  key={`hit-${point.x}`}
                  onPointerEnter={() => {
                    showTooltip({
                      heading: formatX?.(point.x) ?? point.x,
                      left: Math.min((xScale(point.x) ?? 0) + CHART_MARGIN.left + 8, width - 160),
                      top: 8,
                      rows: [
                        {
                          key: one.key,
                          label: one.label,
                          value: formatValue(point.y),
                          slot: one.slot,
                        },
                      ],
                    });
                  }}
                  onPointerLeave={hideTooltip}
                  r={12}
                />
              ))}
            </Group>
          </svg>
        );
      }}
    </ChartFrame>
  );
}
