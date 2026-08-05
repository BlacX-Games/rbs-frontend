import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarRounded } from '@visx/shape';
import { ChartFrame, type ChartFrameProps } from '@/components/charts/ChartFrame';
import { CategoryAxis, ChartGrid, ValueAxis } from '@/components/charts/internal/ChartAxes';
import { CHART_MARGIN, MARK, domainOf, formatNumber, seriesColor } from '@/components/charts/chart';

/**
 * Part-to-whole across categories — the four cost buckets of a session, say.
 *
 * The segments are separated by a 2px gap of SURFACE, not by a stroke. A stroke
 * around each segment adds data-weight ink that is not data and reads as a
 * border; the gap does the separating and keeps neighbours one step apart
 * legible without it.
 *
 * Only the top segment is rounded. Rounding every segment would imply each is
 * its own bar sitting on its own baseline, when in fact only the stack has one.
 */
export function StackedBar(frame: Omit<ChartFrameProps, 'children' | 'legendMark'>) {
  const { series, formatValue = formatNumber, formatX } = frame;

  return (
    <ChartFrame {...frame} legendMark="rect">
      {({ width, innerWidth, innerHeight, showTooltip, hideTooltip }) => {
        const domain = domainOf(series);
        const totals = new Map(
          domain.map((x) => [
            x,
            series.reduce(
              (sum, one) => sum + (one.points.find((point) => point.x === x)?.y ?? 0),
              0,
            ),
          ]),
        );

        const xScale = scaleBand({ domain: [...domain], range: [0, innerWidth], padding: 0.4 });
        const yScale = scaleLinear({
          domain: [0, Math.max(...totals.values(), 0)],
          range: [innerHeight, 0],
          nice: true,
        });

        const barWidth = Math.min(xScale.bandwidth(), MARK.barMaxThickness);

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

              {domain.map((x) => {
                const left = (xScale(x) ?? 0) + (xScale.bandwidth() - barWidth) / 2;
                let cursor = 0;

                return (
                  <Group key={x}>
                    {series.map((one, index) => {
                      const value = one.points.find((point) => point.x === x)?.y ?? 0;
                      if (value === 0) return null;

                      const bottom = yScale(cursor);
                      cursor += value;
                      const top = yScale(cursor);
                      const isTop = index === series.length - 1;

                      return (
                        <BarRounded
                          fill={seriesColor(one.slot)}
                          height={Math.max(bottom - top - MARK.surfaceGap, 1)}
                          key={one.key}
                          radius={MARK.barRadius}
                          top={isTop}
                          width={barWidth}
                          x={left}
                          y={top}
                        />
                      );
                    })}

                    {/*
                      One hit area for the whole stack, listing every segment.
                      Per-segment targets would make the thinnest bucket — often
                      the one an operator is checking — the hardest to reach.
                    */}
                    <rect
                      fill="transparent"
                      height={innerHeight}
                      onPointerEnter={() => {
                        showTooltip({
                          heading: formatX?.(x) ?? x,
                          left: Math.min(left + CHART_MARGIN.left + 8, width - 180),
                          top: 8,
                          rows: series.flatMap((one) => {
                            const point = one.points.find((candidate) => candidate.x === x);

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
                      }}
                      onPointerLeave={hideTooltip}
                      width={xScale.bandwidth()}
                      x={xScale(x) ?? 0}
                      y={0}
                    />
                  </Group>
                );
              })}
            </Group>
          </svg>
        );
      }}
    </ChartFrame>
  );
}
