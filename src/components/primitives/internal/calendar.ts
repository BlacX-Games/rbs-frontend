/**
 * Date maths for DateRangePicker. Pure, dependency-free, and UTC throughout.
 *
 * ── Why ISO strings rather than Date ──────────────────────────────────────────
 * A `Date` is an instant, not a day. Construct one at local midnight, serialize
 * it, and an operator in Auckland filtering "24 Jul" sends 23 Jul to a backend
 * reading UTC. The console's whole job is agreeing with the database about which
 * sessions happened when, so the public surface is `YYYY-MM-DD` — the same shape
 * the API takes and Postgres stores — and `Date` appears only inside this file,
 * only through UTC accessors, and never crosses the boundary.
 *
 * That is the same reasoning golden rule 10 applies to money: the wire format is
 * the safe format, and converting to a native type for convenience is where the
 * precision goes.
 */

/** `YYYY-MM-DD`. Not a branded type — the runtime guard below is the contract. */
export type IsoDate = string;

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_PATTERN.test(value)) return false;

  // A pattern match is not a valid date: "2026-02-31" passes the regex. Round
  // -tripping is the cheapest real check.
  return toIso(toUtcMillis(value)) === value;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function toUtcMillis(iso: IsoDate): number {
  const parts = iso.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  return Date.UTC(year, month - 1, day);
}

function toIso(millis: number): IsoDate {
  const date = new Date(millis);

  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/** A day, decomposed. `month` is 1-based, unlike `Date`. */
export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export function parseIso(iso: IsoDate): DateParts {
  const date = new Date(toUtcMillis(iso));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function fromParts({ year, month, day }: DateParts): IsoDate {
  return toIso(Date.UTC(year, month - 1, day));
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  // 86_400_000ms is only safe because this is UTC — in local time a DST
  // boundary makes some days 23 or 25 hours and this drifts.
  return toIso(toUtcMillis(iso) + days * 86_400_000);
}

export function addMonths(iso: IsoDate, months: number): IsoDate {
  const { year, month, day } = parseIso(iso);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = daysInMonth(target.getUTCFullYear(), target.getUTCMonth() + 1);

  // Clamped, not rolled over. 31 Jan + 1 month is 28 Feb, because an operator
  // paging a calendar forward expects February, and Date's native overflow
  // would silently land them in March.
  return fromParts({
    year: target.getUTCFullYear(),
    month: target.getUTCMonth() + 1,
    day: Math.min(day, lastDay),
  });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function startOfMonth(iso: IsoDate): IsoDate {
  const { year, month } = parseIso(iso);

  return fromParts({ year, month, day: 1 });
}

export function endOfMonth(iso: IsoDate): IsoDate {
  const { year, month } = parseIso(iso);

  return fromParts({ year, month, day: daysInMonth(year, month) });
}

/** `-1`, `0`, or `1`. Lexicographic order on ISO dates IS chronological order. */
export function compareIso(a: IsoDate, b: IsoDate): number {
  if (a === b) return 0;

  return a < b ? -1 : 1;
}

export function isWithin(iso: IsoDate, start: IsoDate, end: IsoDate): boolean {
  const [from, to] = compareIso(start, end) <= 0 ? [start, end] : [end, start];

  return compareIso(iso, from) >= 0 && compareIso(iso, to) <= 0;
}

/** 0 = Sunday … 6 = Saturday, matching `Date.getUTCDay`. */
export function dayOfWeek(iso: IsoDate): number {
  return new Date(toUtcMillis(iso)).getUTCDay();
}

export type WeekStart = 0 | 1;

/**
 * Six rows of seven days, always — including the leading and trailing days that
 * belong to the neighbouring months.
 *
 * Always six rows, never five, because a grid that changes height as an
 * operator pages through months makes the Next button move out from under the
 * pointer. Costs one mostly-empty row in February; buys a calendar that does
 * not jump.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: WeekStart = 1,
): readonly (readonly IsoDate[])[] {
  const first = fromParts({ year, month, day: 1 });
  const offset = (dayOfWeek(first) - weekStartsOn + 7) % 7;
  const gridStart = addDays(first, -offset);

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (__, day) => addDays(gridStart, week * 7 + day)),
  );
}

/**
 * Weekday column headings in the grid's own order.
 *
 * Derived from real dates through `Intl` rather than from a hard-coded array,
 * so a future locale prop changes the language without touching this function.
 * 4 Jan 1970 was a Sunday, which makes it a convenient index-0 anchor.
 */
export function weekdayLabels(
  locale: string,
  weekStartsOn: WeekStart = 1,
  format: 'short' | 'narrow' = 'short',
): readonly string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format, timeZone: 'UTC' });

  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(1970, 0, 4 + ((index + weekStartsOn) % 7)))),
  );
}

export function formatMonth(iso: IsoDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(toUtcMillis(iso)));
}

export function formatDay(iso: IsoDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(toUtcMillis(iso)));
}
