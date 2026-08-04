import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateRangePicker } from '@/components/primitives/DateRangePicker';
import { renderWithProviders } from '../../../support/render';

/**
 * The calendar's keyboard and ARIA contract. The arithmetic beneath it is
 * covered exhaustively in `calendar.test.ts`, so this suite is about the grid.
 *
 * `today` is injected on every render — a calendar that reads the clock is a
 * test that fails on one day of the year and nobody knows why.
 */

const PROPS = {
  label: 'Session dates',
  placeholder: 'Any date',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
  today: '2026-08-04',
} as const;

/** The trigger is a button; the grid only exists once it is open. */
async function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  // The trigger's name is the field label plus its summary, so match on the
  // label half — the summary changes with the selection.
  await user.click(screen.getByRole('button', { name: /Session dates/ }));

  return screen.findByRole('grid');
}

describe('<DateRangePicker />', () => {
  it('shows the placeholder until a range is chosen', () => {
    renderWithProviders(<DateRangePicker {...PROPS} />);

    expect(screen.getByRole('button', { name: 'Session dates Any date' })).toBeVisible();
  });

  it('summarises a chosen range on the trigger', () => {
    renderWithProviders(
      <DateRangePicker {...PROPS} defaultValue={{ start: '2026-08-01', end: '2026-08-31' }} />,
    );

    // `Intl.formatRange`, so the separator and month names follow the locale
    // rather than being assembled by hand.
    // The composed name is what a screen reader hears: the field, then the range.
    expect(screen.getByRole('button', { name: /Session dates.*Aug/ })).toBeVisible();
  });

  it('opens on the month containing today', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DateRangePicker {...PROPS} />);
    await openCalendar(user);

    expect(screen.getByText('August 2026')).toBeVisible();
  });

  it('marks today with aria-current', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DateRangePicker {...PROPS} />);
    const grid = await openCalendar(user);

    expect(within(grid).getByRole('button', { name: 'Tuesday, 4 August 2026' })).toHaveAttribute(
      'aria-current',
      'date',
    );
  });

  it('names every day in full, not just its number', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DateRangePicker {...PROPS} />);
    const grid = await openCalendar(user);

    // "4" alone tells a screen-reader user nothing about which month they are
    // in — and a calendar grid is exactly where that context is easy to lose.
    expect(within(grid).getByRole('button', { name: 'Tuesday, 4 August 2026' })).toBeVisible();
  });

  it('is one tab stop, not forty-two', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DateRangePicker {...PROPS} />);
    const grid = await openCalendar(user);

    // Roving tabindex. Without it, tabbing past a calendar costs six weeks of
    // keypresses.
    const tabbable = within(grid)
      .getAllByRole('button')
      .filter((button) => button.tabIndex === 0);

    expect(tabbable).toHaveLength(1);
  });

  describe('keyboard', () => {
    const CASES = [
      {
        keys: '{ArrowRight}',
        expected: 'Wednesday, 5 August 2026',
        why: 'ArrowRight is one day on',
      },
      { keys: '{ArrowLeft}', expected: 'Monday, 3 August 2026', why: 'ArrowLeft is one day back' },
      { keys: '{ArrowDown}', expected: 'Tuesday, 11 August 2026', why: 'ArrowDown is one week on' },
      { keys: '{ArrowUp}', expected: 'Tuesday, 28 July 2026', why: 'ArrowUp is one week back' },
      { keys: '{Home}', expected: 'Monday, 3 August 2026', why: 'Home is the start of the week' },
      { keys: '{End}', expected: 'Sunday, 9 August 2026', why: 'End is the end of the week' },
      { keys: '{PageUp}', expected: 'Saturday, 4 July 2026', why: 'PageUp is one month back' },
      { keys: '{PageDown}', expected: 'Friday, 4 September 2026', why: 'PageDown is one month on' },
    ] as const;

    it.each(CASES)('$why', async ({ keys, expected }) => {
      const user = userEvent.setup();
      renderWithProviders(<DateRangePicker {...PROPS} />);
      const grid = await openCalendar(user);

      within(grid).getByRole('button', { name: 'Tuesday, 4 August 2026' }).focus();
      await user.keyboard(keys);

      expect(within(grid).getByRole('button', { name: expected })).toHaveFocus();
    });

    it('jumps a year with Shift+PageUp', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DateRangePicker {...PROPS} />);
      const grid = await openCalendar(user);

      within(grid).getByRole('button', { name: 'Tuesday, 4 August 2026' }).focus();
      await user.keyboard('{Shift>}{PageUp}{/Shift}');

      expect(screen.getByText('August 2025')).toBeVisible();
    });
  });

  it('selects a range in two clicks', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<DateRangePicker {...PROPS} onValueChange={onValueChange} />);
    const grid = await openCalendar(user);

    await user.click(within(grid).getByRole('button', { name: 'Monday, 10 August 2026' }));
    await user.click(within(grid).getByRole('button', { name: 'Friday, 14 August 2026' }));

    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-08-10', end: '2026-08-14' });
  });

  it('normalises a range picked backwards', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<DateRangePicker {...PROPS} onValueChange={onValueChange} />);
    const grid = await openCalendar(user);

    await user.click(within(grid).getByRole('button', { name: 'Friday, 14 August 2026' }));
    await user.click(within(grid).getByRole('button', { name: 'Monday, 10 August 2026' }));

    // The second click landing before the first is ordinary use, not an error.
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-08-10', end: '2026-08-14' });
  });

  it('clears the old range while a new one is being picked', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <DateRangePicker
        {...PROPS}
        defaultValue={{ start: '2026-08-01', end: '2026-08-05' }}
        onValueChange={onValueChange}
      />,
    );
    const grid = await openCalendar(user);

    await user.click(within(grid).getByRole('button', { name: 'Monday, 10 August 2026' }));

    // Leaving the previous range painted while a new one is half-picked reads
    // as two ranges at once.
    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it('refuses days outside min and max', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <DateRangePicker
        {...PROPS}
        max="2026-08-20"
        min="2026-08-10"
        onValueChange={onValueChange}
      />,
    );
    const grid = await openCalendar(user);

    const outside = within(grid).getByRole('button', { name: 'Saturday, 1 August 2026' });

    expect(outside).toHaveAttribute('aria-disabled', 'true');

    await user.click(outside);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('announces the month as it changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DateRangePicker {...PROPS} />);
    await openCalendar(user);

    // A live region, because paging otherwise turns the grid into a different
    // month with no announcement at all.
    expect(screen.getByText('August 2026')).toHaveAttribute('aria-live', 'polite');

    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(screen.getByText('September 2026')).toBeVisible();
  });
});
