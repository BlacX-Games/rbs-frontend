import { LOCALE, formatDecimal, formatMoney } from '@/lib/money';

/**
 * Locale-aware formatting. One module, so no screen builds its own `Intl`.
 *
 * Money is re-exported rather than reimplemented: `lib/money.ts` formats from a
 * decimal *string* through an exact path, and a second currency formatter here
 * is exactly how a `Number(value)` gets in (golden rule 10).
 *
 * Every `Intl` instance is constructed once at module scope. Constructing one
 * per call is the single most common performance mistake with `Intl` — it is
 * the expensive part, and a table of 50,000 rows formatting a date per cell
 * would build 50,000 formatters.
 */

export { formatMoney, formatDecimal };

/* ── Dates ───────────────────────────────────────────────────────────────── */

/**
 * Dates cross the wire as ISO-8601 strings — `Date.prototype.toJSON()` on the
 * backend, either implicitly through `res.json()` or explicitly through
 * `.toISOString()`. Both produce UTC.
 *
 * Rendering is the one place a `Date` is legitimate: it is an instant being
 * shown in the operator's zone, not a day being sent anywhere. Anything going
 * back over the wire stays a string — `components/primitives/internal/calendar.ts`
 * holds that rule for date *inputs*, and it is UTC-only for the same reason.
 */
const DATE = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const DATE_TIME = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
const TIME = new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short' });

function parseIso(value: string): Date | null {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at;
}

/**
 * A malformed timestamp renders as an em dash, not "Invalid Date".
 *
 * The Zod schemas at the API boundary should make this unreachable for anything
 * that came from the network. It stays because the fallback for a value that
 * slipped through should be a cell that reads as "no value", not one that reads
 * as a bug in the operator's data.
 */
export const NO_VALUE = '—';

export function formatDate(iso: string): string {
  const at = parseIso(iso);
  return at === null ? NO_VALUE : DATE.format(at);
}

export function formatDateTime(iso: string): string {
  const at = parseIso(iso);
  return at === null ? NO_VALUE : DATE_TIME.format(at);
}

export function formatTime(iso: string): string {
  const at = parseIso(iso);
  return at === null ? NO_VALUE : TIME.format(at);
}

/** `2026-08-05` — the wire form for a calendar day, and what an input round-trips. */
export function toIsoDate(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/* ── Numbers ─────────────────────────────────────────────────────────────── */

const INTEGER = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });

/** Counts: covers served, times ordered, row totals. */
export function formatCount(value: number): string {
  return INTEGER.format(value);
}

/** `12.4K` — for a stat tile where the exact figure is in the table below it. */
export function formatCompact(value: number): string {
  return COMPACT.format(value);
}

/**
 * A percentage FIGURE, already scaled: `46.7` renders as `46.7%`.
 *
 * Takes the figure rather than the ratio because that is what the backend's
 * `computeEconomy` returns and what `lib/number.ts#toPercent` produces —
 * re-dividing by 100 here so `Intl`'s `style: 'percent'` can multiply it back
 * is a round trip through a float for no gain.
 *
 * `null` renders as the em dash. A percentage whose base was zero is genuinely
 * unknown, and `0%` would report a healthy food cost for a service that sold
 * nothing.
 */
export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null) return NO_VALUE;

  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

/**
 * A signed figure, with a true minus and an explicit plus.
 *
 * `ServiceSession.reputationChange` is signed and a bare `3` beside a `-5` in
 * the same column reads as an absolute value. The sign is the meaning here, so
 * it is always shown — and it is never the only channel: §5.6 and golden rule 9
 * require a glyph beside it.
 */
const SIGNED = new Intl.NumberFormat(LOCALE, { signDisplay: 'exceptZero' });

export function formatSigned(value: number): string {
  return SIGNED.format(value).replace('-', '−');
}
