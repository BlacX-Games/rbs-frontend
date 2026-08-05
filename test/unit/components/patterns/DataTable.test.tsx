import type { ColumnDef } from '@tanstack/react-table';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { DataTable } from '@/components/patterns/DataTable';
import { DetailDrawer } from '@/components/patterns/DetailDrawer';
import { FilterBar } from '@/components/patterns/FilterBar';
import { Button } from '@/components/primitives/Button';
import { renderWithProviders } from '../../../support/render';

interface Session {
  readonly id: string;
  readonly restaurant: string;
  readonly covers: number;
  /** A decimal STRING, exactly as it crosses the wire. */
  readonly revenue: string;
}

const SESSIONS: readonly Session[] = [
  { id: 's1', restaurant: 'The Ember Room', covers: 42, revenue: '1840.00' },
  { id: 's2', restaurant: 'Declan’s Smokehouse', covers: 28, revenue: '990.50' },
  { id: 's3', restaurant: 'Trattoria', covers: 61, revenue: '2260.00' },
];

const COLUMNS: readonly ColumnDef<Session, never>[] = [
  { id: 'restaurant', accessorKey: 'restaurant', header: 'Restaurant' },
  { id: 'covers', accessorKey: 'covers', header: 'Covers', meta: { numeric: true } },
  { id: 'revenue', accessorKey: 'revenue', header: 'Revenue', meta: { numeric: true } },
];

describe('<DataTable />', () => {
  it('renders a captioned table with a row per record', () => {
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    const table = screen.getByRole('table', { name: 'Sessions' });

    // Three data rows plus the header row.
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('declares aria-sort on the column it is ordered by', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    const header = screen.getByRole('columnheader', { name: /Covers/ });

    // §5.6 asks for aria-sort explicitly. Without it the arrow is a picture and
    // a screen-reader user cannot tell which column orders the table.
    expect(header).not.toHaveAttribute('aria-sort');

    // A NUMERIC column sorts descending first. That is TanStack's
    // `sortDescFirst` default and it is the right one here: an operator
    // clicking "Covers" or "Revenue" wants the busiest service at the top, not
    // the quietest. Asserted rather than assumed, because the announced
    // direction has to match the rows either way.
    await user.click(within(header).getByRole('button'));

    expect(header).toHaveAttribute('aria-sort', 'descending');

    await user.click(within(header).getByRole('button'));

    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts a text column ascending first', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    const header = screen.getByRole('columnheader', { name: /Restaurant/ });
    await user.click(within(header).getByRole('button'));

    // The mirror of the case above: names read A→Z first, numbers biggest
    // first. Both are TanStack defaults and both are what an operator expects.
    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('actually reorders the rows it says it sorted', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    await user.click(
      within(screen.getByRole('columnheader', { name: /Covers/ })).getByRole('button'),
    );

    const cells = screen
      .getAllByRole('cell')
      .filter((cell) => /^\d+$/.test(cell.textContent ?? ''));

    // The announced direction and the rendered order must agree — a header
    // saying "descending" over ascending rows is worse than no aria-sort.
    expect(cells.map((cell) => cell.textContent)).toEqual(['61', '42', '28']);
  });

  it('right-aligns numeric columns and gives them tabular figures', () => {
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    // `tabular` in columns and NOT on hero figures: equal-width digits are what
    // make a column align down the page.
    const cell = screen.getByRole('cell', { name: '1840.00' });

    expect(cell).toHaveClass('tabular');
    expect(cell).toHaveClass('text-right');
  });

  it('names every selection checkbox distinctly', async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    renderWithProviders(
      <DataTable
        caption="Sessions"
        columns={COLUMNS}
        onSelectedChange={onSelectedChange}
        rowId={(row) => row.id}
        rows={SESSIONS}
        selectLabel={(row) => `Select ${row.restaurant}`}
        selectable
      />,
    );

    // Three identically-named "Select" checkboxes would be indistinguishable in
    // a screen reader's list — the same rule MultiSelect's removeLabel follows.
    await user.click(screen.getByRole('checkbox', { name: 'Select The Ember Room' }));

    expect(onSelectedChange).toHaveBeenCalledWith(['s1']);
  });

  it('reports a partial selection as mixed, never as checked', () => {
    renderWithProviders(
      <DataTable
        caption="Sessions"
        columns={COLUMNS}
        rowId={(row) => row.id}
        rows={SESSIONS}
        selectAllLabel="Select all sessions"
        selectLabel={(row) => `Select ${row.restaurant}`}
        selectable
        selected={['s1']}
      />,
    );

    // A header checkbox reading "checked" while one of three rows is selected
    // claims a bulk action would hit everything.
    expect(screen.getByRole('checkbox', { name: 'Select all sessions' })).toHaveAttribute(
      'aria-checked',
      'mixed',
    );
  });

  it('hides a column from the visibility menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    await user.click(screen.getByRole('button', { name: 'Columns' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Revenue' }));

    expect(screen.queryByRole('columnheader', { name: /Revenue/ })).not.toBeInTheDocument();
  });

  it('is a focusable scroll region', () => {
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    // The same SC 2.1.1 failure the Heatmap's axe pass caught: a scrollable
    // region a keyboard cannot reach hides every row past the fold.
    expect(screen.getByRole('region', { name: 'Sessions' })).toHaveAttribute('tabindex', '0');
  });

  it('falls back to an empty state that names the next action', () => {
    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={[]} />,
    );

    expect(screen.getByText('No rows')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('<ConfirmDialog />', () => {
  const PROPS = {
    title: 'Delete The Ember Room?',
    description: 'This removes the restaurant and every session under it.',
    confirmWord: 'DELETE',
    confirmLabel: 'Type DELETE to confirm',
    cancelLabel: 'Cancel',
    actionLabel: 'Delete restaurant',
  } as const;

  it('keeps the action locked until the literal matches exactly', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog {...PROPS} onConfirm={onConfirm} open trigger={<Button>Open</Button>} />,
    );

    const action = await screen.findByRole('button', { name: 'Delete restaurant' });
    expect(action).toBeDisabled();

    // Golden rule 8. Case-folding or trimming would defeat the point: the
    // operator has to reproduce the word deliberately, and it is the same
    // literal the backend's own `confirm: "DELETE"` field requires.
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'delete');
    expect(action).toBeDisabled();

    await user.clear(screen.getByLabelText('Type DELETE to confirm'));
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');

    expect(action).toBeEnabled();

    await user.click(action);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('announces itself as an alertdialog', async () => {
    renderWithProviders(<ConfirmDialog {...PROPS} onConfirm={() => undefined} open />);

    // Not a plain dialog: this interrupts for a reason, and Radix's AlertDialog
    // also refuses to close on an outside click so the ritual cannot be
    // dismissed by a stray tap.
    expect(await screen.findByRole('alertdialog', { name: PROPS.title })).toBeVisible();
  });

  it('shows the consequence above the input', async () => {
    renderWithProviders(
      <ConfirmDialog
        {...PROPS}
        consequence={<p>3 sessions and 7 reviews will be deleted.</p>}
        onConfirm={() => undefined}
        open
      />,
    );

    // §6.1 wants the cascade count surfaced before the operator commits, not
    // beside the button they are already reaching for.
    expect(await screen.findByText('3 sessions and 7 reviews will be deleted.')).toBeVisible();
  });
});

describe('<FilterBar />', () => {
  it('is one labelled region above what it scopes', () => {
    renderWithProviders(
      <FilterBar label="Session filters">
        <Button>Date range</Button>
      </FilterBar>,
    );

    // One row, never per-chart — every panel below re-renders against the same
    // slice, so the numbers on screen always agree.
    expect(screen.getByRole('region', { name: 'Session filters' })).toBeVisible();
  });

  it('offers a clear only when something is filtered', () => {
    const { rerender } = renderWithProviders(
      <FilterBar activeCount={0} label="Session filters" onClear={() => undefined}>
        <Button>Date range</Button>
      </FilterBar>,
    );

    expect(screen.queryByRole('button', { name: /Clear filters/ })).not.toBeInTheDocument();

    rerender(
      <FilterBar activeCount={2} label="Session filters" onClear={() => undefined}>
        <Button>Date range</Button>
      </FilterBar>,
    );

    expect(screen.getByRole('button', { name: /Clear filters/ })).toBeVisible();
  });
});

describe('<DetailDrawer />', () => {
  it('renders its fields as a description list', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DetailDrawer
        closeLabel="Close"
        fields={[
          { label: 'Session id', value: '018f2c…', mono: true },
          { label: 'Covers', value: '42' },
        ]}
        title="Service session"
        trigger={<Button>Peek</Button>}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Peek' }));

    // A dl, because label/value pairs ARE one. A grid of divs reads as a run of
    // unrelated strings with no indication which value belongs to which label.
    const dialog = await screen.findByRole('dialog', { name: 'Service session' });

    expect(within(dialog).getByText('Session id')).toBeVisible();
    expect(within(dialog).getByText('018f2c…')).toBeVisible();
  });
});

describe('<DataTable /> — server-side sort', () => {
  it('reports a sort change instead of reordering the rows itself', async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();

    renderWithProviders(
      <DataTable
        caption="Sessions"
        columns={COLUMNS}
        onSortingChange={onSortingChange}
        rowId={(row) => row.id}
        rows={SESSIONS}
        sorting={[]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Covers/ }));

    // `desc: true` on the FIRST click: TanStack opens a numeric column
    // descending, because "most covers" is the question someone sorting a
    // number column is usually asking.
    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'covers', desc: true }]);

    // The rows must NOT have moved: the caller owns the order, and reordering
    // here would sort the loaded page on top of the server's ordering of the
    // whole set — so the table would show a sorted page and call it the top of
    // the list.
    const rows = within(screen.getByRole('table', { name: 'Sessions' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('The Ember Room');
  });

  it("renders the caller's sort state, including aria-sort", () => {
    renderWithProviders(
      <DataTable
        caption="Sessions"
        columns={COLUMNS}
        onSortingChange={vi.fn()}
        rowId={(row) => row.id}
        rows={SESSIONS}
        sorting={[{ id: 'revenue', desc: true }]}
      />,
    );

    // §5.6 asks for aria-sort explicitly — without it the arrow is a picture.
    expect(screen.getByRole('columnheader', { name: /Revenue/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('still sorts for itself when the caller does not take control', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <DataTable caption="Sessions" columns={COLUMNS} rowId={(row) => row.id} rows={SESSIONS} />,
    );

    await user.click(screen.getByRole('button', { name: /Covers/ }));

    // Uncontrolled is still the default: a list that fits in one response has
    // no reason to round-trip a sort. Trattoria has the most covers, and a
    // numeric column opens descending.
    const rows = within(screen.getByRole('table', { name: 'Sessions' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Trattoria');
  });
});
