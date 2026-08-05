import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarRounded } from '@visx/shape';
import { ChartFrame, type ChartFrameProps } from '@/components/charts/ChartFrame';
import { CategoryAxis, ChartGrid, ValueAxis } from '@/components/charts/internal/ChartAxes';
import {
  CHART_MARGIN,
  MARK,
  domainOf,
  extentOf,
  formatNumber,
  seriesColor,
} from '@/components/charts/chart';

/**
 * Magnitude across categories.
 *
 * Two things this deliberately does not do:
 *
 * • It never colours bars darker-where-bigger. That double-encodes bar length as
 *   hue, burns the only free channel on information the chart already shows, and
 *   fails the categorical checks by design. One series is one colour for every
 *   bar; the ordered case (tiers, funnel steps) is a different component.
 * • It never truncates the baseline. `extentOf` always includes zero, because a
 *   cropped axis exaggerates every difference without anyone deciding to.
 */
export function BarChart(frame: Omit<ChartFrameProps, 'children' | 'legendMark'>) {
  const { series, formatValue = formatNumber, formatX } = frame;

  return (
    <ChartFrame {...frame} legendMark="rect">
      {({ width, innerWidth, innerHeight, showTooltip, hideTooltip }) => {
        const domain = domainOf(series);
        const xScale = scaleBand({
          domain: [...domain],
          range: [0, innerWidth],
          // The gap between neighbours is surface showing through, not a stroke.
          padding: 0.3,
        });
        const yScale = scaleLinear({
          domain: [...extentOf(series)],
          range: [innerHeight, 0],
          nice: true,
        });

        // Capped, never filling the band — the leftover is air.
        const groupWidth = Math.min(xScale.bandwidth(), MARK.barMaxThickness * series.length);
        const barWidth = Math.max(groupWidth / series.length - MARK.surfaceGap, 1);

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

              {domain.map((x) =>
                series.map((one, index) => {
                  const point = one.points.find((candidate) => candidate.x === x);
                  if (point === undefined) return null;

                  const bandStart = (xScale(x) ?? 0) + (xScale.bandwidth() - groupWidth) / 2;
                  const left = bandStart + index * (barWidth + MARK.surfaceGap);
                  const top = yScale(Math.max(point.y, 0));
                  const barHeight = Math.abs(yScale(point.y) - yScale(0));

                  return (
                    <Group key={`${one.key}-${x}`}>
                      <BarRounded
                        fill={seriesColor(one.slot)}
                        height={barHeight}
                        // Rounded at the data end, square at the baseline.
                        radius={MARK.barRadius}
                        top
                        width={barWidth}
                        x={left}
                        y={top}
                      />
                      {/* The mark is the hit target, and the target is bigger
                          than the mark — the full band height, so a short bar
                          is as easy to reach as a tall one. */}
                      <rect
                        fill="transparent"
                        height={innerHeight}
                        onPointerEnter={() => {
                          showTooltip({
                            heading: formatX?.(x) ?? x,
                            left: Math.min(left + CHART_MARGIN.left + 8, width - 160),
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
                        width={barWidth + MARK.surfaceGap}
                        x={left - MARK.surfaceGap / 2}
                        y={0}
                      />
                    </Group>
                  );
                }),
              )}
            </Group>
          </svg>
        );
      }}
    </ChartFrame>
  );
}
