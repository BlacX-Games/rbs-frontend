import { ChartFrame, type ChartFrameProps } from '@/components/charts/ChartFrame';
import { formatNumber } from '@/components/charts/chart';

/**
 * Magnitude across a grid — covers by weekday × hour, say.
 *
 * SEQUENTIAL, so one hue with more-is-darker, never a rainbow. The ramp is the
 * gold accent at stepped opacity over the raised surface: a single hue whose
 * lightness carries the value, which is the only encoding that stays readable
 * for every kind of colour vision.
 *
 * A scale legend is mandatory here in a way it is not elsewhere — a continuous
 * ramp with no key is unreadable, and colour is the ONLY channel a cell has.
 * Between that and the table view, no value is reachable by hue alone.
 */
export function Heatmap({
  rows,
  columns,
  valueAt,
  scaleLowLabel,
  scaleHighLabel,
  formatValue = formatNumber,
  ...frame
}: Omit<ChartFrameProps, 'children' | 'legendMark' | 'series'> & {
  readonly rows: readonly { readonly key: string; readonly label: string }[];
  readonly columns: readonly { readonly key: string; readonly label: string }[];
  readonly valueAt: (rowKey: string, columnKey: string) => number;
  readonly scaleLowLabel: string;
  readonly scaleHighLabel: string;
}) {
  const values = rows.flatMap((row) => columns.map((column) => valueAt(row.key, column.key)));
  const max = Math.max(...values, 0);

  return (
    <ChartFrame
      {...frame}
      formatValue={formatValue}
      legendMark="rect"
      series={rows.map((row) => ({
        key: row.key,
        label: row.label,
        // Every row takes the SAME slot — the gold — because a heatmap is
        // sequential, not categorical. Handing each row its own hue would put
        // identity colours on an encoding whose whole meaning is magnitude, and
        // cycling back to slot 1 past eight rows is the thing the palette rules
        // forbid outright.
        slot: 4,
        points: columns.map((column) => ({
          x: column.label,
          y: valueAt(row.key, column.key),
        })),
      }))}
    >
      {() => (
        // A scrollable region must be focusable, or a keyboard user cannot
        // reach the columns that overflow — axe reports it as
        // `scrollable-region-focusable`, and it is a real SC 2.1.1 failure
        // rather than a technicality. `tabIndex` makes it arrow-scrollable and
        // the label says what was just focused.
        <div
          aria-label={frame.title}
          className="focus-visible:focus-ring flex h-full flex-col gap-8 overflow-x-auto rounded-sm"
          role="region"
          tabIndex={0}
        >
          <table className="border-collapse">
            <caption className="sr-only">{frame.title}</caption>
            <thead>
              <tr>
                <th className="sr-only" scope="col">
                  {frame.xLabel}
                </th>
                {columns.map((column) => (
                  <th
                    className="text-ink-secondary px-2 pb-4 text-xs font-medium"
                    key={column.key}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th
                    className="text-ink-secondary pr-8 text-right text-xs font-normal"
                    scope="row"
                  >
                    {row.label}
                  </th>
                  {columns.map((column) => {
                    const value = valueAt(row.key, column.key);

                    return (
                      <td className="p-2" key={column.key}>
                        {/*
                          A real cell with a title, so the value is reachable on
                          hover AND in the table view — never by reading a shade.
                        */}
                        <span
                          className="border-hairline block size-24 rounded-sm border"
                          style={{
                            backgroundColor: 'var(--gold-accent)',
                            opacity: max === 0 ? 0.05 : 0.1 + (value / max) * 0.9,
                          }}
                          title={`${row.label} · ${column.label}: ${formatValue(value)}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-ink-secondary flex items-center gap-8 text-xs">
            {scaleLowLabel}
            <span
              aria-hidden={true}
              className="border-hairline h-8 w-64 rounded-full border"
              style={{
                backgroundImage:
                  'linear-gradient(to right, color-mix(in oklab, var(--gold-accent) 10%, transparent), var(--gold-accent))',
              }}
            />
            {scaleHighLabel}
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
