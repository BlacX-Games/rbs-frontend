import { ParentSize } from '@visx/responsive';
import { useId, useState, type ReactNode } from 'react';
import { ChartTable } from '@/components/charts/internal/ChartTable';
import {
  CHART_MARGIN,
  formatNumber,
  seriesColor,
  type ChartSeries,
} from '@/components/charts/chart';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

/** One row of a tooltip readout. */
export interface TooltipRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly slot: ChartSeries['slot'];
}

export interface TooltipState {
  readonly heading: string;
  readonly rows: readonly TooltipRow[];
  /** Client coordinates within the frame. */
  readonly left: number;
  readonly top: number;
}

export interface ChartCanvas {
  readonly width: number;
  readonly height: number;
  /** Plot area, with the axis gutters already taken off. */
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly showTooltip: (next: TooltipState) => void;
  readonly hideTooltip: () => void;
}

export type ChartFrameProps = {
  readonly title: string;
  readonly description?: string;
  readonly series: readonly ChartSeries[];
  /** Names the domain column in the table view — "Date", "Concept". */
  readonly xLabel: string;
  readonly formatValue?: (value: number) => string;
  readonly formatX?: (x: string) => string;
  /** Toggle copy. User-visible, so required rather than defaulted. */
  readonly tableLabel: string;
  readonly chartLabel: string;
  /** Legends mirror the mark: a line key for lines, a swatch for fills. */
  readonly legendMark?: 'line' | 'rect';
  readonly height?: number;
  /** Bypasses measurement. Tests and fixed layouts pass it; nothing else. */
  readonly width?: number;
  readonly className?: string;
  readonly children: (canvas: ChartCanvas) => ReactNode;
};

/**
 * The shell every chart wears: title, legend, tooltip host, and the table
 * toggle.
 *
 * Centralising it is what makes the accessibility contract enforceable rather
 * than aspirational — a chart cannot ship without a table view, because the
 * frame renders the toggle and the chart body is a render prop inside it.
 */
export function ChartFrame({
  title,
  description,
  series,
  xLabel,
  formatValue = formatNumber,
  formatX,
  tableLabel,
  chartLabel,
  legendMark = 'line',
  height = 240,
  width,
  className,
  children,
}: ChartFrameProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [asTable, setAsTable] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const innerHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;

  /*
   * A legend for two or more series, and none for one.
   *
   * With a single series there is one colour and the title already says what is
   * plotted; a box with one swatch restates the title and costs space. With two
   * or more, identity must never rest on colour-matching alone — which is the
   * same rule golden rule 9 states for status.
   */
  const showLegend = series.length >= 2;

  return (
    <figure
      aria-describedby={description === undefined ? undefined : descriptionId}
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
            <p className="text-ink-secondary text-sm" id={descriptionId}>
              {description}
            </p>
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

      {showLegend ? (
        <ul className="flex flex-wrap items-center gap-16">
          {series.map((one) => (
            <li className="text-ink-secondary flex items-center gap-4 text-sm" key={one.key}>
              {/*
                The legend mirrors the mark — a short stroke for lines, a swatch
                for fills — so the key an operator scans matches what they are
                scanning for.
              */}
              <span
                aria-hidden={true}
                className={cn(
                  'shrink-0',
                  legendMark === 'line' ? 'h-2 w-16 rounded-full' : 'size-8 rounded-sm',
                )}
                style={{ backgroundColor: seriesColor(one.slot) }}
              />
              {one.label}
            </li>
          ))}
        </ul>
      ) : null}

      {asTable ? (
        <ChartTable
          caption={title}
          formatValue={formatValue}
          series={series}
          xLabel={xLabel}
          {...(formatX !== undefined && { formatX })}
        />
      ) : (
        <div className="relative" style={{ height }}>
          {width === undefined ? (
            <ParentSize>
              {({ width: measured }) =>
                measured === 0
                  ? null
                  : children({
                      width: measured,
                      height,
                      innerWidth: measured - CHART_MARGIN.left - CHART_MARGIN.right,
                      innerHeight,
                      showTooltip: setTooltip,
                      hideTooltip: () => {
                        setTooltip(null);
                      },
                    })
              }
            </ParentSize>
          ) : (
            children({
              width,
              height,
              innerWidth: width - CHART_MARGIN.left - CHART_MARGIN.right,
              innerHeight,
              showTooltip: setTooltip,
              hideTooltip: () => {
                setTooltip(null);
              },
            })
          )}

          {tooltip === null ? null : (
            <div
              className="border-rule bg-overlay pointer-events-none absolute z-10 flex flex-col gap-4 rounded-md border p-8 shadow-3"
              style={{ left: tooltip.left, top: tooltip.top }}
            >
              <p className="text-ink-tertiary text-xs">{tooltip.heading}</p>
              {tooltip.rows.map((row) => (
                <p className="flex items-center gap-8 text-sm" key={row.key}>
                  {/*
                    A line key, not a filled box: at tooltip density a swatch is
                    data-weight ink doing a label's job.
                  */}
                  <span
                    aria-hidden={true}
                    className="h-2 w-12 shrink-0 rounded-full"
                    style={{ backgroundColor: seriesColor(row.slot) }}
                  />
                  {/* Value leads, label follows — the reader already has the
                      series and wants the number. */}
                  <span className="text-ink tabular font-medium">{row.value}</span>
                  <span className="text-ink-secondary">{row.label}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
