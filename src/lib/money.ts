/**
 * Exact decimal arithmetic on strings. Golden rule 10: money is a string
 * end-to-end, and nothing here ever produces or consumes a `number` for a
 * currency value.
 *
 * ── Why a string, and why BigInt underneath ─────────────────────────────────
 * Postgres stores money as `Decimal(12,2)` and Unity's `EconomyTests` assert
 * `3 × 19.99m == 59.97m` exactly. `3 * 19.99` in IEEE-754 is
 * `59.970000000000006`. A single `parseFloat` on a currency field anywhere in
 * this bundle breaks that equality, and it breaks it *quietly* — the wrong
 * number renders, formatted to two decimals, looking entirely plausible.
 *
 * So values stay strings at the boundary and become `bigint` minor units for
 * arithmetic. `bigint` is exact at any magnitude and needs no dependency.
 *
 * ── What the wire actually sends ────────────────────────────────────────────
 * Prisma hands `res.json()` a `Decimal` instance, whose `toJSON` is decimal.js's
 * `toString` — which normalizes to significant digits, NOT to the column's
 * declared scale. Verified against the installed runtime:
 *
 *     Decimal('18.00') → "18"      Decimal('5.40') → "5.4"     Decimal('30.00') → "30"
 *
 * An $18.00 dish price therefore arrives as the four characters `"18"`. Every
 * parser here accepts that form, every formatter re-pads it, and the mock
 * fixtures store it unpadded so the mocks cannot flatter the real backend.
 *
 * ── Non-currency decimals live here too ─────────────────────────────────────
 * `Dish.averageRating` is `Decimal(3,2)` and `foodCostPercentage` is
 * `Decimal(5,2)`. They arrive as the same normalized strings and are formatted
 * by the same exact path, so no screen has to decide whether a given decimal is
 * "currency enough" to deserve exactness.
 */

/** `Decimal(12,2)` — two fractional digits, everywhere money is stored. */
export const MONEY_SCALE = 2;

/**
 * AUTHORED (§12). No currency is stored anywhere in `schema.prisma` and none is
 * specified in the GDD; the §6.1 wireframes show `$`. One constant so a real
 * multi-currency decision is one edit and a search for `'USD'` finds every
 * assumption.
 */
export const CURRENCY = 'USD';

/**
 * Single locale for now. A locale *switch* belongs to the i18n layer that will
 * replace `src/i18n/` when a second language is funded; hard-coding it in ten
 * `Intl` call sites is what makes that swap expensive.
 */
export const LOCALE = 'en-US';

/** `-2310.5`, `18`, `+0.99`, `.5` — a plain decimal, no exponent, no separators. */
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function reject(value: string): never {
  throw new TypeError(`Not a decimal string: ${JSON.stringify(value)}`);
}

/**
 * Decimal string → scaled integer minor units. `"18"` at scale 2 is `1800n`.
 *
 * Excess precision is an error rather than a silent round. A value with three
 * decimals reaching a scale-2 field means the wire contract moved, and rounding
 * it here would hide that until someone reconciled a total by hand.
 */
export function toMinorUnits(value: string, scale: number = MONEY_SCALE): bigint {
  if (!DECIMAL_PATTERN.test(value)) reject(value);

  const negative = value.startsWith('-');
  const unsigned = value.replace(/^[+-]/, '');
  const [whole = '', fraction = ''] = unsigned.split('.');

  if (fraction.length > scale) {
    throw new RangeError(
      `${JSON.stringify(value)} carries ${String(fraction.length)} decimals, but the field holds ${String(scale)}.`,
    );
  }

  // String padding, not multiplication: `10n ** BigInt(scale)` would be exact
  // too, but concatenation makes the "shift the point right" operation literal
  // and cannot overflow anything on the way.
  const digits = `${whole || '0'}${fraction.padEnd(scale, '0')}`;
  const units = BigInt(digits);

  return negative ? -units : units;
}

/**
 * Scaled integer minor units → the canonical, fully-padded decimal string.
 *
 * Always padded — `1800n` becomes `"18.00"`, not `"18"`. This is our internal
 * canonical form; the *wire* form is whatever the backend sent, and the two
 * differ deliberately (see the header). Anything we send back is padded, which
 * every `Decimal` parser accepts.
 */
export function fromMinorUnits(units: bigint, scale: number = MONEY_SCALE): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0');

  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  const body = scale === 0 ? whole : `${whole}.${fraction}`;

  return negative ? `-${body}` : body;
}

/** Re-pad a wire value to its canonical form: `"5.4"` → `"5.40"`. */
export function normalizeMoney(value: string, scale: number = MONEY_SCALE): string {
  return fromMinorUnits(toMinorUnits(value, scale), scale);
}

export function addMoney(a: string, b: string, scale: number = MONEY_SCALE): string {
  return fromMinorUnits(toMinorUnits(a, scale) + toMinorUnits(b, scale), scale);
}

export function subtractMoney(a: string, b: string, scale: number = MONEY_SCALE): string {
  return fromMinorUnits(toMinorUnits(a, scale) - toMinorUnits(b, scale), scale);
}

/**
 * Multiply by a whole count — three of a $19.99 dish.
 *
 * Integers only, and that restriction is the point. A fractional factor (a tax
 * rate, a 15% margin target) needs a rounding rule, and no document in any of
 * the three repos states one for money. Guessing here would put a half-cent
 * convention into the console that the sim never agreed to; refusing sends
 * whoever needs it to author the rule first.
 */
export function multiplyMoney(value: string, factor: number, scale: number = MONEY_SCALE): string {
  if (!Number.isInteger(factor)) {
    throw new TypeError(
      `multiplyMoney takes a whole count, got ${String(factor)} — a fractional factor needs a rounding rule this project has not authored.`,
    );
  }

  return fromMinorUnits(toMinorUnits(value, scale) * BigInt(factor), scale);
}

export function sumMoney(values: readonly string[], scale: number = MONEY_SCALE): string {
  let total = 0n;
  for (const value of values) total += toMinorUnits(value, scale);
  return fromMinorUnits(total, scale);
}

/**
 * Sort comparator for a money column.
 *
 * `DataTable` deliberately does not know a cell is money — it renders an
 * already-formatted string — so a money column passes this as its `sortingFn`.
 * Lexical sorting of `"9.00"` against `"18.00"` puts nine above eighteen.
 */
export function compareMoney(a: string, b: string, scale: number = MONEY_SCALE): number {
  const left = toMinorUnits(a, scale);
  const right = toMinorUnits(b, scale);

  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isNegativeMoney(value: string, scale: number = MONEY_SCALE): boolean {
  return toMinorUnits(value, scale) < 0n;
}

export function isZeroMoney(value: string, scale: number = MONEY_SCALE): boolean {
  return toMinorUnits(value, scale) === 0n;
}

/**
 * U+2212 MINUS SIGN, not U+002D HYPHEN-MINUS.
 *
 * §5.3 pairs tabular figures with a true minus: the hyphen is narrower than a
 * digit, so a column of negatives sits a fraction of an em out of alignment
 * from the positives above it. `Intl` emits the hyphen, so we swap it — only
 * ever the leading one, which is the only place `en-US` puts a sign.
 */
const MINUS = '−';

function withTrueMinus(formatted: string): string {
  return formatted.startsWith('-') ? `${MINUS}${formatted.slice(1)}` : formatted;
}

/**
 * The one type assertion in this module, and the reason it is contained here.
 *
 * `Intl.NumberFormat.prototype.format` accepts any decimal string at runtime
 * (Intl NumberFormat v3) and formats it exactly. TypeScript's lib types it as
 * `StringNumericLiteral` — a template-literal type — which a `string` is never
 * assignable to. So the choice is a cast or a `Number()`, and `Number()` would
 * undo the entire module.
 *
 * Every caller below has already run the value through `toMinorUnits`, which
 * throws on anything that is not a decimal. The cast asserts exactly what that
 * parse proved, in one place, rather than at each call site.
 */
function formatExact(formatter: Intl.NumberFormat, decimalString: string): string {
  return formatter.format(decimalString as `${number}`);
}

export interface FormatMoneyOptions {
  /** Drop the currency symbol — for a column already headed "Revenue ($)". */
  readonly bare?: boolean;
  /** Keep `Intl`'s hyphen instead of the true minus. For CSV, which is data, not type. */
  readonly asciiMinus?: boolean;
}

/**
 * Format for display: `"18"` → `"$18.00"`, `"-2310.5"` → `"−$2,310.50"`.
 *
 * `Intl.NumberFormat.prototype.format` accepts a **string** (Intl NumberFormat
 * v3, Node 20+ / Chrome 106+) and formats it exactly, with no float in the
 * path — verified past `Number.MAX_SAFE_INTEGER`. Passing `Number(value)` here
 * instead would undo the entire module in one character.
 */
export function formatMoney(value: string, options: FormatMoneyOptions = {}): string {
  // Normalizing first is what makes the output stable: `Intl` would render the
  // wire's `"18"` as `$18.00` anyway, but it would render `"18.005"` as
  // `$18.01`, silently accepting precision the field cannot hold. `toMinorUnits`
  // rejects that instead.
  const canonical = normalizeMoney(value);

  const formatted = formatExact(
    new Intl.NumberFormat(LOCALE, {
      style: options.bare === true ? 'decimal' : 'currency',
      currency: CURRENCY,
      minimumFractionDigits: MONEY_SCALE,
      maximumFractionDigits: MONEY_SCALE,
    }),
    canonical,
  );

  return options.asciiMinus === true ? formatted : withTrueMinus(formatted);
}

export interface FormatDecimalOptions {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly asciiMinus?: boolean;
}

/**
 * Format a non-currency decimal string — a rating, a percentage figure.
 *
 * Same exact path as money: the string goes to `Intl` untouched, so a
 * `Decimal(3,2)` rating of `"4.5"` renders as `4.5` and never as `4.499999`.
 */
export function formatDecimal(value: string, options: FormatDecimalOptions = {}): string {
  if (!DECIMAL_PATTERN.test(value)) reject(value);

  const formatted = formatExact(
    new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? MONEY_SCALE,
    }),
    value,
  );

  return options.asciiMinus === true ? formatted : withTrueMinus(formatted);
}
