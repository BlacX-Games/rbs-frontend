import { z } from 'zod';
import { MONEY_SCALE, toMinorUnits } from '@/lib/money';

/**
 * The shared vocabulary every entity schema is built from.
 *
 * ── Why schemas at all, when the types would compile ────────────────────────
 * These are the trust boundary. A response is *parsed* here, never cast: the
 * `/admin/v1` surface does not exist yet, so today the shapes are asserted
 * against a mock we wrote — and the moment a real backend appears, the same
 * parse is what tells us the contract moved, at the seam, instead of three
 * components deep as `undefined is not an object`.
 *
 * ── Schemas are the source; types are inferred ──────────────────────────────
 * `domain/types.ts` re-exports `z.infer` of everything here. Hand-writing both
 * gives two definitions that drift on the first field rename with nothing to
 * catch it — the same reasoning that makes `rbs-backend` re-export Prisma's
 * generated model types instead of declaring parallel interfaces.
 */

/* ── Identifiers ─────────────────────────────────────────────────────────── */

/**
 * Every PK in `schema.prisma` is `@default(uuid(7))`. Validated as a UUID but
 * not pinned to v7: the version digit is a property of how the backend mints
 * them, and a console that rejects a legitimately-migrated identifier is worse
 * than one that accepts a well-formed identifier of another version.
 */
export const UuidSchema = z.uuid();

/* ── Time ────────────────────────────────────────────────────────────────── */

/**
 * ISO-8601, always UTC. The backend produces these two ways — implicitly via
 * `res.json()` calling `Date.prototype.toJSON()`, and explicitly via
 * `.toISOString()` — and both land on the same wire format.
 */
export const IsoDateTimeSchema = z.iso.datetime();

/**
 * A calendar DAY, as `YYYY-MM-DD`. Never a `Date`: a `Date` is an instant, and
 * constructing one at local midnight sends the wrong day from half the world's
 * timezones. `primitives/internal/calendar.ts` holds the same rule for inputs.
 */
export const IsoDateSchema = z.iso.date();

/* ── Money and decimals ──────────────────────────────────────────────────── */

/**
 * A decimal that arrives as a string, and stays one.
 *
 * Refined through `toMinorUnits` rather than a second regex, so the validator
 * and the arithmetic can never disagree about what a decimal is — and so a
 * value carrying more precision than the column holds is rejected at the seam
 * instead of silently rounded three layers in.
 *
 * Note what this deliberately ACCEPTS: the unpadded form the backend actually
 * sends. Prisma serializes `Decimal('18.00')` as the string `"18"`, so a schema
 * demanding two decimal places would reject every real price.
 */
export function decimal(scale: number = MONEY_SCALE) {
  return z.string().refine(
    (value) => {
      try {
        toMinorUnits(value, scale);
        return true;
      } catch {
        return false;
      }
    },
    { message: `Expected a decimal string with at most ${String(scale)} decimal places` },
  );
}

/** `Decimal(12,2)` and `Decimal(10,2)` — every currency column. */
export const MoneySchema = decimal(MONEY_SCALE);

/** `Dish.averageRating` / `Drink.averageRating` — `Decimal(3,2)`, 0–5. */
export const RatingSchema = decimal(2);

/** `Dish.foodCostPercentage` — `Decimal(5,2)`, a percentage FIGURE not a ratio. */
export const PercentageSchema = decimal(2);

/* ── Scores ──────────────────────────────────────────────────────────────── */

/** Every 0–100 band in the design: reputation, satisfaction, DQS/CQS, hygiene. */
export const ScoreSchema = z.int().min(0).max(100);

/* ── The list envelope (§8.4) ────────────────────────────────────────────── */

/**
 * `{ items, nextCursor, total? }` — AUTHORED (§12), not sourced.
 *
 * `rbs-backend` has no pagination of any kind: a search of its `src/` for
 * `cursor`, `paginat`, `hasMore`, `page`, and `offset` returns nothing, and its
 * one list-shaped response (`GET /save/:id/history`) is a bounded array of at
 * most five entries. So this shape is a request to the backend, served today by
 * the mock network.
 *
 * Cursor rather than page/offset because UUID v7 keys are time-sortable, which
 * makes a cursor stable under concurrent writes where an offset silently skips
 * or repeats a row. `Pagination` is Previous/Next for exactly this reason — a
 * cursor cannot express "jump to page 7", and a numbered control would be an
 * affordance that looks like it works and cannot.
 *
 * `total` is optional because counting a filtered cross-tenant table is a
 * second query the backend may decline to run on a large list. A list without
 * it renders the range without a denominator rather than a wrong one.
 */
export function pageOf<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    /** `null` means this is the last page — never an empty string. */
    nextCursor: z.string().min(1).nullable(),
    total: z.int().min(0).optional(),
  });
}

/**
 * The shape without an item type, for helpers that only touch the envelope.
 *
 * `total?: number | undefined` spells the `undefined` out rather than relying
 * on `?`. Under `exactOptionalPropertyTypes` a bare `total?: number` means
 * "absent, or a number — never present-and-undefined", and Zod's `.optional()`
 * produces exactly the type that rule rejects. The same friction the README
 * documents for Radix props, from the other direction.
 */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly total?: number | undefined;
}

/* ── The error envelope ──────────────────────────────────────────────────── */

/**
 * `{ error: { message, code?, details? } }` — `middleware/errorHandler.ts:26-32`.
 *
 * This one IS sourced, exactly, and it is the single most important shape in
 * this file: it is the only response contract the existing backend and the
 * future admin surface are guaranteed to share.
 *
 * `code` is the stable machine-readable string a client branches on;
 * `middleware/validate.ts` populates `details` with `{ path, message }` issues
 * and deliberately never echoes the offending value, so a password cannot ride
 * back out in an error body. On any 5xx the backend replaces `message` with the
 * literal `"Internal Server Error"` and drops `details` entirely.
 */
export const ValidationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
});
