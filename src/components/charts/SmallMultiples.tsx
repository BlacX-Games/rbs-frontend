import { curveMonotoneX } from '@visx/curve';
import { scaleLinear, scalePoint } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useId, useState } from 'react';
import { ChartTable } from '@/components/charts/internal/ChartTable';
import {
  MARK,
  extentOf,
  formatNumber,
  seriesColor,
  type ChartPoint,
  type ChartSeries,
} from '@/components/charts/chart';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

/**
 * The answer to "more series than hues".
 *
 * §5.2 says it outright: the ten guest archetypes render as small multiples,
 * NEVER as ten hues, because no eight-hue ordering clears the all-pairs ΔE
 * floor and a ninth generated hue is indistinguishable from an existing one
 * under CVD. Faceting solves it by removing the need for identity colour
 * altogether — each panel is titled, so nothing is being told apart by colour.
 *
 * Every panel therefore takes the SAME slot. A shared y-domain is the other
 * half of the contract: panels on independent scales look comparable and are
 * not, which is the whole failure this form exists to avoid.
 */
export function SmallMultiples({
  title,
  description,
  series,
  xLabel,
  tableLabel,
  chartLabel,
  formatValue = formatNumber,
  formatX,
  slot = 4,
  panelHeight = 64,
  className,
}: {
  readonly title: string;
  readonly description?: string;
  readonly series: readonly ChartSeries[];
  readonly xLabel: string;
  readonly tableLabel: string;
  readonly chartLabel: string;
  readonly formatValue?: (value: number) => string;
  readonly formatX?: (x: string) => string;
  readonly slot?: ChartSeries['slot'];
  readonly panelHeight?: number;
  readonly className?: string;
}) {
  const titleId = useId();
  const [asTable, setAsTable] = useState(false);

  // ONE domain across every panel. Per-panel scaling would make a quiet
  // archetype look as busy as a popular one.
  const [low, high] = extentOf(series);

  return (
    <figure
      aria-labelledby={titleId}
      className={cn(
        'border-rule bg-surface flex flex-col gap-12 rounded-md border p-16',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-start justify-between gap-8">
        <div className="flex flex-col gap-2">
          <h4 className="text-ink text-base font-medium" id={titleId}>
            {title}
          </h4>
          {description === undefined ? null : (
            <p className="text-ink-secondary text-sm">{description}</p>
          )}
        </div>
        <Button
          aria-pressed={asTable}
          onClick={() => {
            setAsTable((current) => !current);
          }}
          variant="ghost"
        >
          {asTable ? chartLabel : tableLabel}
        </Button>
      </figcaption>

      {asTable ? (
        <ChartTable
          caption={title}
          formatValue={formatValue}
          series={series}
          xLabel={xLabel}
          {...(formatX !== undefined && { formatX })}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-16 md:grid-cols-3">
          {series.map((one) => {
            const values = one.points.map((point) => point.y);
            const peak = Math.max(...values, 0);

            // Built ONCE per panel. Constructing them inside the accessors —
            // which visx calls per point, per mark — rebuilds a d3 scale for
            // every datum, and ten archetypes × two marks makes that hundreds
            // of allocations on each render.
            const xScale = scalePoint({
              domain: one.points.map((point) => point.x),
              range: [2, 118],
            });
            const yScale = scaleLinear({ domain: [low, high], range: [panelHeight - 2, 2] });

            return (
              <li className="flex flex-col gap-4" key={one.key}>
                {/* The panel title is the identity channel. That is what makes
                    a single shared hue correct rather than a compromise. */}
                <p className="text-ink-secondary truncate text-xs font-medium">{one.label}</p>

                <svg
                  aria-label={`${one.label}: peak ${formatValue(peak)}`}
                  height={panelHeight}
                  role="img"
                  viewBox={`0 0 120 ${String(panelHeight)}`}
                  width="100%"
                >
                  <AreaClosed<ChartPoint>
                    curve={curveMonotoneX}
                    data={[...one.points]}
                    fill={seriesColor(slot)}
                    fillOpacity={MARK.areaOpacity}
                    x={(point) => xScale(point.x) ?? 0}
                    y={(point) => yScale(point.y)}
                    yScale={yScale}
                  />
                  <LinePath<ChartPoint>
                    curve={curveMonotoneX}
                    data={[...one.points]}
                    stroke={seriesColor(slot)}
                    strokeLinecap="round"
                    strokeWidth={MARK.lineWidth}
                    x={(point) => xScale(point.x) ?? 0}
                    y={(point) => yScale(point.y)}
                  />
                </svg>

                <p className="text-ink tabular text-sm font-medium">{formatValue(peak)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
