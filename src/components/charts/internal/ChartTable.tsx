import { domainOf, formatNumber, seriesColor, type ChartSeries } from '@/components/charts/chart';

/**
 * The table-view twin every chart is required to have.
 *
 * Not a fallback and not a debug affordance: it is the WCAG-clean equivalent of
 * the chart, and it is what makes two decisions legal elsewhere.
 *
 * 1. §5.2's relief rule. `--series-3` and `--series-5` measure 2.77:1 and
 *    2.65:1 on the paper theme, under the 3:1 bar for a graphical object. The
 *    palette validator PASSes them only on condition that any chart using them
 *    ships visible direct labels or a table view. This is that condition.
 * 2. Tooltips may then enhance rather than gate — every value a tooltip shows
 *    is reachable here without a pointer at all.
 */
export function ChartTable({
  series,
  xLabel,
  caption,
  formatValue = formatNumber,
  formatX = (x) => x,
}: {
  readonly series: readonly ChartSeries[];
  readonly xLabel: string;
  readonly caption: string;
  readonly formatValue?: (value: number) => string;
  readonly formatX?: (x: string) => string;
}) {
  const domain = domainOf(series);

  return (
    <table className="border-rule w-full border-collapse border-t text-left">
      <caption className="text-ink-tertiary pb-8 text-left text-xs">{caption}</caption>

      <thead>
        <tr className="border-rule border-b">
          <th
            className="text-ink-tertiary px-(--cell-pad-x) py-(--cell-pad-y) text-xs font-medium"
            scope="col"
          >
            {xLabel}
          </th>
          {series.map((one) => (
            <th
              className="text-ink-tertiary px-(--cell-pad-x) py-(--cell-pad-y) text-right text-xs font-medium"
              key={one.key}
              scope="col"
            >
              <span className="inline-flex items-center gap-4">
                {/*
                  A swatch beside the name, never the name in the series colour.
                  Text wears text tokens: a light categorical hue is illegible as
                  type on the surface, and colouring it would put identity in the
                  one channel that cannot carry it.
                */}
                <span
                  aria-hidden={true}
                  className="size-8 shrink-0 rounded-full"
                  style={{ backgroundColor: seriesColor(one.slot) }}
                />
                {one.label}
              </span>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {domain.map((x) => (
          <tr className="border-hairline h-(--row-h) border-b" key={x}>
            <th
              className="px-(--cell-pad-x) py-(--cell-pad-y) text-(length:--text-table) font-normal"
              scope="row"
            >
              {formatX(x)}
            </th>
            {series.map((one) => {
              const point = one.points.find((candidate) => candidate.x === x);

              return (
                <td
                  // `tabular` here and NOT on the hero figures: equal-width
                  // digits are what make a column align, and what makes a
                  // standalone 48px number look loose.
                  className="tabular px-(--cell-pad-x) py-(--cell-pad-y) text-right text-(length:--text-table)"
                  key={one.key}
                >
                  {point === undefined ? '—' : formatValue(point.y)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
