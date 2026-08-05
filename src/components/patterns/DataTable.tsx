import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Download } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { downloadCsv, toCsv } from '@/components/patterns/internal/csv';
import { Button } from '@/components/primitives/Button';
import { Checkbox } from '@/components/primitives/Checkbox';
import { DropdownCheckboxMenu } from '@/components/primitives/DropdownMenu';
import { EmptyState } from '@/components/patterns/states';
import { cn } from '@/lib/cn';

/**
 * Per-column metadata this table understands.
 *
 * Declared through TanStack's `meta` escape hatch so the column definitions
 * stay plain `ColumnDef`s and a caller can use any TanStack feature we have
 * not wrapped.
 */
export interface DataColumnMeta {
  /** Right-aligns the column AND its header. Numbers and money only. */
  readonly numeric?: boolean;
  /** Plain text for the CSV export, where a cell renders as JSX. */
  readonly toCsvValue?: (row: never) => string;
}

export type DataTableProps<Row> = {
  readonly columns: readonly ColumnDef<Row, never>[];
  readonly rows: readonly Row[];
  /** Stable identity. Row selection and virtualisation both depend on it. */
  readonly rowId: (row: Row) => string;
  /** Names the table for assistive tech, and captions it visibly. */
  readonly caption: string;
  readonly captionHidden?: boolean;
  readonly selectable?: boolean;
  readonly selected?: readonly string[];
  readonly onSelectedChange?: (next: readonly string[]) => void;
  /** Required when `selectable` — each checkbox needs its own name. */
  readonly selectLabel?: (row: Row) => string;
  readonly selectAllLabel?: string;
  readonly columnsLabel?: string;
  readonly exportLabel?: string;
  readonly exportFilename?: string;
  readonly empty?: ReactNode;
  /** Virtualises above this many rows. The plan targets 50,000. */
  readonly virtualizeFrom?: number;
  readonly className?: string;
};

/**
 * The console's primary surface. §5.1 principle 2: density is a feature, and
 * operators scan hundreds of sessions.
 *
 * What is load-bearing rather than decorative:
 *
 * • `aria-sort` on every sortable header, per §5.6. A sort arrow alone tells a
 *   screen-reader user nothing about which column is ordering the data.
 * • Row heights come from `--row-h`, so the operator's density preference moves
 *   the whole table rather than each cell being separately tuned.
 * • Money arrives as an already-formatted string in the cell. Nothing here
 *   parses a currency value — sorting a money column is the caller's job via
 *   `sortingFn`, because only they know it is a decimal string.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowId,
  caption,
  captionHidden = false,
  selectable = false,
  selected,
  onSelectedChange,
  selectLabel,
  selectAllLabel = 'Select all rows',
  columnsLabel = 'Columns',
  exportLabel = 'Export CSV',
  exportFilename = 'export.csv',
  empty,
  virtualizeFrom = 100,
  className,
}: DataTableProps<Row>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  /*
   * The rule is right in general and does not apply here. It warns that
   * `useReactTable` returns functions that cannot be memoized safely — true,
   * and the reason none of the values read off `table` below are wrapped in
   * `useMemo` or passed to a memoized child. The instance itself is created
   * once per render by design, which is TanStack's documented model.
   */
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: columns as ColumnDef<Row, unknown>[],
    data: rows as Row[],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: rowId,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    state: { sorting, columnVisibility },
  });

  const modelRows = table.getRowModel().rows;
  const selectedSet = useMemo(() => new Set(selected ?? []), [selected]);

  /*
   * Virtualised only past a threshold.
   *
   * Below it the DOM cost is irrelevant and a plain table keeps native
   * find-in-page, which operators genuinely use. Above it, rendering fifty
   * thousand rows is what makes the tab unresponsive.
   */
  const virtualize = modelRows.length > virtualizeFrom;
  const virtualizer = useVirtualizer({
    count: modelRows.length,
    getScrollElement: () => scrollRef.current,
    // A fixed estimate is right here because every row IS --row-h — the density
    // token guarantees what a measuring virtualiser would have to discover.
    estimateSize: () => 44,
    overscan: 12,
  });

  const items = virtualize
    ? virtualizer.getVirtualItems()
    : modelRows.map((_, index) => ({ index, key: index, start: 0, size: 0 }));

  const allSelected = modelRows.length > 0 && modelRows.every((row) => selectedSet.has(row.id));
  const someSelected = modelRows.some((row) => selectedSet.has(row.id)) && !allSelected;

  const toggleAll = (): void => {
    onSelectedChange?.(allSelected ? [] : modelRows.map((row) => row.id));
  };

  const toggleRow = (id: string): void => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange?.([...next]);
  };

  const exportRows = (): void => {
    const visible = table.getVisibleLeafColumns();
    const headers = visible.map((column) => String(column.columnDef.header ?? column.id));
    const body = modelRows.map((row) =>
      visible.map((column) => {
        const meta = column.columnDef.meta as DataColumnMeta | undefined;
        const value = meta?.toCsvValue?.(row.original as never) ?? row.getValue(column.id);

        return value === null || value === undefined ? '' : String(value);
      }),
    );

    downloadCsv(exportFilename, toCsv(headers, body));
  };

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className="flex flex-wrap items-center justify-end gap-8">
        <DropdownCheckboxMenu
          items={table.getAllLeafColumns().map((column) => ({
            id: column.id,
            label: String(column.columnDef.header ?? column.id),
            checked: column.getIsVisible(),
            onCheckedChange: (checked) => {
              column.toggleVisibility(checked);
            },
          }))}
          label={columnsLabel}
          trigger={<Button icon={<Columns3 />}>{columnsLabel}</Button>}
        />
        <Button icon={<Download />} onClick={exportRows}>
          {exportLabel}
        </Button>
      </div>

      {modelRows.length === 0 ? (
        (empty ?? <EmptyState description="Nothing matches this filter." title="No rows" />)
      ) : (
        <div
          // A scrollable region must be focusable, or a keyboard user cannot
          // reach the columns and rows that overflow — the same SC 2.1.1 failure
          // the Heatmap's axe pass caught in stage 3a.
          aria-label={caption}
          className="border-rule focus-visible:focus-ring max-h-96 overflow-auto rounded-md border"
          ref={scrollRef}
          role="region"
          tabIndex={0}
        >
          <table className="w-full border-collapse text-left">
            <caption
              className={cn('text-ink-tertiary p-8 text-left text-xs', captionHidden && 'sr-only')}
            >
              {caption}
            </caption>

            <thead className="bg-surface sticky top-0 z-10">
              {table.getHeaderGroups().map((group) => (
                <tr className="border-rule border-b" key={group.id}>
                  {selectable ? (
                    <th className="bg-surface sticky left-0 z-20 px-(--cell-pad-x)" scope="col">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        label={selectAllLabel}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                  ) : null}

                  {group.headers.map((header) => {
                    const meta = header.column.columnDef.meta as DataColumnMeta | undefined;
                    const sorted = header.column.getIsSorted();
                    const SortGlyph =
                      sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown;

                    return (
                      <th
                        // §5.6 asks for aria-sort explicitly. Without it the
                        // arrow is a picture, and a screen-reader user has no
                        // way to know which column orders the table.
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : undefined
                        }
                        className={cn(
                          'text-ink-tertiary px-(--cell-pad-x) py-(--cell-pad-y) text-xs font-medium',
                          meta?.numeric === true && 'text-right',
                        )}
                        key={header.id}
                        scope="col"
                      >
                        {header.column.getCanSort() ? (
                          <button
                            // The TARGET is the whole header cell, not the
                            // label. A 16px sort control is a pinpoint, and
                            // §5.6's floor applies to it exactly as it does to
                            // any other button — the same reasoning that makes
                            // the slider's track its target rather than its
                            // thumb. Caught by the e2e density sweep.
                            className={cn(
                              'focus-visible:focus-ring hover:text-ink flex w-full items-center gap-4 rounded-sm',
                              'min-h-(--control-h)',
                              meta?.numeric === true
                                ? 'flex-row-reverse justify-start'
                                : 'justify-start',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                            type="button"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortGlyph aria-hidden={true} className="size-12 shrink-0" />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody
              style={
                virtualize
                  ? { height: virtualizer.getTotalSize(), position: 'relative' }
                  : undefined
              }
            >
              {items.map((item) => {
                const row = modelRows[item.index];
                if (row === undefined) return null;

                return (
                  <tr
                    className="border-hairline h-(--row-h) border-b"
                    data-selected={selectedSet.has(row.id) || undefined}
                    key={row.id}
                    style={
                      virtualize
                        ? {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${String(item.start)}px)`,
                          }
                        : undefined
                    }
                  >
                    {selectable ? (
                      <td className="bg-surface sticky left-0 z-10 px-(--cell-pad-x)">
                        <Checkbox
                          checked={selectedSet.has(row.id)}
                          label={selectLabel?.(row.original) ?? row.id}
                          onCheckedChange={() => {
                            toggleRow(row.id);
                          }}
                        />
                      </td>
                    ) : null}

                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as DataColumnMeta | undefined;

                      return (
                        <td
                          className={cn(
                            'px-(--cell-pad-x) py-(--cell-pad-y) text-(length:--text-table)',
                            // `tabular` on numeric columns ONLY: equal-width
                            // digits are what make a column align, and what
                            // makes a standalone hero figure look loose.
                            meta?.numeric === true && 'tabular text-right',
                          )}
                          key={cell.id}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
