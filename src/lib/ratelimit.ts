/**
 * Parses the rate-limit headers `rbs-backend` actually sends.
 *
 * ── The correction this file encodes ────────────────────────────────────────
 * §7.4 says a 429 "surfaces the `ratelimit-policy` header as a countdown". It
 * does not: `express-rate-limit` v8 is configured with
 * `standardHeaders: 'draft-8'` (`middleware/rateLimit.ts:23-33`), and draft-8
 * splits the two concerns —
 *
 *     RateLimit:        "global"; r=0; t=487        ← r = remaining, t = seconds to reset
 *     RateLimit-Policy: "global"; q=300; w=900      ← q = quota,     w = window seconds
 *
 * The countdown is `t` on `RateLimit`. `RateLimit-Policy` carries only the
 * static policy and never moves, so a countdown driven from it would sit at the
 * full window forever. `Retry-After` is also set, but only on the limited
 * response — `RateLimit` is present on every response, which is what lets a
 * screen warn *before* the wall.
 *
 * `legacyHeaders: false`, so there are no `X-RateLimit-*` headers to fall back
 * to. Anything unparseable degrades to `null` rather than a guessed number: a
 * countdown that is wrong is worse than a message that says "try again shortly".
 */

export interface RateLimitState {
  /** Requests left in the current window. */
  readonly remaining: number | null;
  /** Seconds until the window resets — what a countdown ticks down. */
  readonly resetSeconds: number | null;
  /** Requests permitted per window. */
  readonly limit: number | null;
  /** Window length in seconds. */
  readonly windowSeconds: number | null;
}

const EMPTY: RateLimitState = {
  remaining: null,
  resetSeconds: null,
  limit: null,
  windowSeconds: null,
};

/**
 * Reads one `key=value` parameter out of a structured-field item.
 *
 * A regex rather than a real RFC 9651 parser. The full grammar admits nested
 * lists, byte sequences, and quoted strings with escapes, none of which
 * `express-rate-limit` emits — it writes exactly `"<name>"; k=<integer>` pairs.
 * A parser for a grammar we never receive is code that cannot be tested against
 * anything real.
 */
function readParam(header: string | null, key: string): number | null {
  if (header === null) return null;

  const match = new RegExp(`(?:^|;)\\s*${key}\\s*=\\s*(-?\\d+)`).exec(header);
  if (match?.[1] === undefined) return null;

  const value = Number(match[1]);
  return Number.isSafeInteger(value) ? value : null;
}

/** Reads the draft-8 pair off any response. Absent headers give a `null` field, never a throw. */
export function readRateLimit(headers: Headers): RateLimitState {
  const limit = headers.get('ratelimit');
  const policy = headers.get('ratelimit-policy');

  if (limit === null && policy === null) return EMPTY;

  return {
    remaining: readParam(limit, 'r'),
    resetSeconds: readParam(limit, 't'),
    limit: readParam(policy, 'q'),
    windowSeconds: readParam(policy, 'w'),
  };
}

/**
 * Seconds to wait before retrying, preferring the header that is actually
 * about waiting.
 *
 * `Retry-After` may be an HTTP-date rather than a delta — the spec allows both,
 * and `express-rate-limit` sends the delta form. The date branch is handled
 * anyway because a proxy in front of the backend may rewrite it, and a
 * `NaN`-second countdown renders as "retry in NaN seconds".
 */
export function retryAfterSeconds(headers: Headers, now: number): number | null {
  const retryAfter = headers.get('retry-after');

  if (retryAfter !== null) {
    const delta = Number(retryAfter);
    if (Number.isSafeInteger(delta) && delta >= 0) return delta;

    const at = Date.parse(retryAfter);
    if (!Number.isNaN(at)) return Math.max(0, Math.ceil((at - now) / 1000));
  }

  return readRateLimit(headers).resetSeconds;
}
