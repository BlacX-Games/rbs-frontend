import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  compareIso,
  daysInMonth,
  endOfMonth,
  formatMonth,
  isIsoDate,
  isWithin,
  parseIso,
  weekdayLabels,
} from '@/components/primitives/internal/calendar';

/**
 * The date maths under DateRangePicker.
 *
 * Pure, so it is tested exhaustively here and the component's own suite can be
 * about keyboard and ARIA rather than about arithmetic. The cases below are the
 * ones that actually break calendars: month-end clamping, leap years, DST
 * boundaries, and year rollover.
 */

describe('isIsoDate', () => {
  const CASES = [
    { value: '2026-08-04', valid: true, why: 'a real day' },
    { value: '2024-02-29', valid: true, why: 'a leap day in a leap year' },
    { value: '2026-02-29', valid: false, why: 'a leap day in a common year' },
    { value: '2026-02-31', valid: false, why: 'a day that does not exist' },
    { value: '2026-13-01', valid: false, why: 'a month that does not exist' },
    { value: '2026-8-4', valid: false, why: 'unpadded components' },
    { value: '04/08/2026', valid: false, why: 'a display format' },
    { value: '', valid: false, why: 'nothing at all' },
  ] as const;

  it.each(CASES)('$why → $valid', ({ value, valid }) => {
    // The regex alone accepts 2026-02-31; the round-trip is what rejects it.
    expect(isIsoDate(value)).toBe(valid);
  });
});

describe('addDays', () => {
  const CASES = [
    { from: '2026-08-04', days: 1, expected: '2026-08-05', why: 'forward one' },
    { from: '2026-08-04', days: -1, expected: '2026-08-03', why: 'back one' },
    { from: '2026-08-31', days: 1, expected: '2026-09-01', why: 'across a month end' },
    { from: '2026-12-31', days: 1, expected: '2027-01-01', why: 'across a year end' },
    { from: '2024-02-28', days: 1, expected: '2024-02-29', why: 'into a leap day' },
    { from: '2026-02-28', days: 1, expected: '2026-03-01', why: 'past a missing leap day' },
    // The reason this module never touches local time. In a DST zone a day is
    // sometimes 23 hours, and millisecond arithmetic on a local Date lands on
    // the previous evening — which serializes as the wrong day entirely.
    { from: '2026-03-28', days: 1, expected: '2026-03-29', why: 'across a European DST spring' },
    { from: '2026-10-24', days: 1, expected: '2026-10-25', why: 'across a European DST autumn' },
  ] as const;

  it.each(CASES)('$why', ({ from, days, expected }) => {
    expect(addDays(from, days)).toBe(expected);
  });
});

describe('addMonths', () => {
  const CASES = [
    { from: '2026-08-04', months: 1, expected: '2026-09-04', why: 'forward one' },
    { from: '2026-01-31', months: 1, expected: '2026-02-28', why: 'clamps to a shorter month' },
    { from: '2024-01-31', months: 1, expected: '2024-02-29', why: 'clamps to a leap February' },
    { from: '2026-03-31', months: -1, expected: '2026-02-28', why: 'clamps going backwards' },
    { from: '2026-12-15', months: 1, expected: '2027-01-15', why: 'crosses a year' },
    { from: '2026-01-15', months: -1, expected: '2025-12-15', why: 'crosses a year backwards' },
  ] as const;

  it.each(CASES)('$why', ({ from, months, expected }) => {
    // Clamped, never rolled over: 31 Jan + 1 month must land in February. Date's
    // native overflow would put an operator in March, one page past where the
    // button they pressed said they were going.
    expect(addMonths(from, months)).toBe(expected);
  });
});

describe('daysInMonth', () => {
  const CASES = [
    { year: 2026, month: 1, expected: 31, why: 'January' },
    { year: 2026, month: 2, expected: 28, why: 'a common February' },
    { year: 2024, month: 2, expected: 29, why: 'a leap February' },
    { year: 2000, month: 2, expected: 29, why: 'a 400-year leap February' },
    { year: 1900, month: 2, expected: 28, why: 'a 100-year non-leap February' },
    { year: 2026, month: 4, expected: 30, why: 'April' },
  ] as const;

  it.each(CASES)('$why → $expected', ({ year, month, expected }) => {
    expect(daysInMonth(year, month)).toBe(expected);
  });
});

describe('compareIso and isWithin', () => {
  it('orders lexicographically, which for ISO is chronologically', () => {
    expect(compareIso('2026-08-04', '2026-08-05')).toBe(-1);
    expect(compareIso('2026-08-05', '2026-08-04')).toBe(1);
    expect(compareIso('2026-08-04', '2026-08-04')).toBe(0);
  });

  it('includes both endpoints', () => {
    expect(isWithin('2026-08-01', '2026-08-01', '2026-08-31')).toBe(true);
    expect(isWithin('2026-08-31', '2026-08-01', '2026-08-31')).toBe(true);
    expect(isWithin('2026-07-31', '2026-08-01', '2026-08-31')).toBe(false);
  });

  it('accepts a reversed range', () => {
    // While dragging a range an operator's second click can land before the
    // first. Normalising here means every caller does not have to.
    expect(isWithin('2026-08-15', '2026-08-31', '2026-08-01')).toBe(true);
  });
});

describe('buildMonthGrid', () => {
  it('is always six rows of seven', () => {
    for (const [year, month] of [
      [2026, 2],
      [2026, 8],
      [2021, 2],
    ] as const) {
      const grid = buildMonthGrid(year, month);

      // Always six, even when five would fit. A grid that changes height as the
      // operator pages moves the Next button out from under the pointer.
      expect(grid, `${String(year)}-${String(month)}`).toHaveLength(6);
      expect(grid.every((week) => week.length === 7)).toBe(true);
    }
  });

  it('starts on the Monday before the first of the month', () => {
    // 1 Aug 2026 is a Saturday, so a Monday-start grid opens on 27 Jul.
    const grid = buildMonthGrid(2026, 8, 1);

    expect(grid[0]?.[0]).toBe('2026-07-27');
  });

  it('starts on the Sunday when asked to', () => {
    const grid = buildMonthGrid(2026, 8, 0);

    expect(grid[0]?.[0]).toBe('2026-07-26');
  });

  it('runs contiguously with no gaps or repeats', () => {
    const days = buildMonthGrid(2026, 8).flat();

    expect(days).toHaveLength(42);
    expect(new Set(days).size).toBe(42);
    for (let index = 1; index < days.length; index += 1) {
      expect(addDays(days[index - 1] ?? '', 1)).toBe(days[index]);
    }
  });

  it('covers every day of the target month', () => {
    const days = new Set(buildMonthGrid(2026, 2).flat());

    for (let day = 1; day <= 28; day += 1) {
      expect(days.has(`2026-02-${String(day).padStart(2, '0')}`), `day ${String(day)}`).toBe(true);
    }
  });
});

describe('Intl formatting', () => {
  it('labels weekdays in the grid’s own order', () => {
    const monday = weekdayLabels('en-GB', 1);
    const sunday = weekdayLabels('en-GB', 0);

    // Derived from real dates rather than a hard-coded array, so a locale prop
    // later changes the language without touching the function.
    expect(monday[0]).toBe('Mon');
    expect(sunday[0]).toBe('Sun');
    expect(monday).toHaveLength(7);
  });

  it('formats a month heading in UTC, not the runner’s timezone', () => {
    // timeZone: 'UTC' is what stops the first of a month rendering as the
    // previous month for anyone west of Greenwich.
    expect(formatMonth('2026-08-01', 'en-GB')).toBe('August 2026');
  });

  it('round-trips through parseIso', () => {
    expect(parseIso('2026-08-04')).toEqual({ year: 2026, month: 8, day: 4 });
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
  });
});
