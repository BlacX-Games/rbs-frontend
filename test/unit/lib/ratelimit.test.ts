import { describe, expect, it } from 'vitest';
import { readRateLimit, retryAfterSeconds } from '@/lib/ratelimit';

/**
 * The draft-8 headers `express-rate-limit` v8 actually emits.
 *
 * Fixtures are copied from the shape the backend's `baseOptions`
 * (`standardHeaders: 'draft-8'`, `legacyHeaders: false`) produce, so this suite
 * fails if we ever start parsing the header §7.4 mistakenly named.
 */

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe('readRateLimit', () => {
  it('takes the countdown from RateLimit, not RateLimit-Policy', () => {
    // The correction this module exists for. `t` on RateLimit is seconds to
    // reset and ticks down; `w` on RateLimit-Policy is the static window and
    // never moves, so a countdown driven from it sits at 900 forever.
    const state = readRateLimit(
      headers({
        RateLimit: '"global"; r=42; t=487',
        'RateLimit-Policy': '"global"; q=300; w=900',
      }),
    );

    expect(state).toEqual({ remaining: 42, resetSeconds: 487, limit: 300, windowSeconds: 900 });
  });

  it('reads a limited response, where remaining is zero', () => {
    const state = readRateLimit(headers({ RateLimit: '"auth"; r=0; t=12' }));

    expect(state.remaining).toBe(0);
    expect(state.resetSeconds).toBe(12);
    // Absent policy header — null, not a guessed default.
    expect(state.limit).toBeNull();
  });

  it('returns nulls rather than guesses when the headers are absent', () => {
    // `legacyHeaders: false`, so there are no X-RateLimit-* to fall back to.
    expect(readRateLimit(headers({ 'X-RateLimit-Remaining': '5' }))).toEqual({
      remaining: null,
      resetSeconds: null,
      limit: null,
      windowSeconds: null,
    });
  });

  it('degrades on a malformed value instead of producing NaN', () => {
    // A countdown that renders "try again in NaN seconds" is worse than one
    // that renders no countdown at all.
    const state = readRateLimit(headers({ RateLimit: '"global"; r=abc; t=' }));

    expect(state.remaining).toBeNull();
    expect(state.resetSeconds).toBeNull();
  });

  it('does not confuse one parameter for another', () => {
    // `r` must not match the `r` inside "rate", and `t` must not match the `t`
    // in a quoted policy name.
    const state = readRateLimit(headers({ RateLimit: '"strict"; r=7; t=99' }));

    expect(state.remaining).toBe(7);
    expect(state.resetSeconds).toBe(99);
  });
});

describe('retryAfterSeconds', () => {
  const NOW = Date.parse('2026-08-05T12:00:00.000Z');

  it('prefers Retry-After when it is a delta', () => {
    expect(
      retryAfterSeconds(headers({ 'Retry-After': '30', RateLimit: '"g"; r=0; t=99' }), NOW),
    ).toBe(30);
  });

  it('handles the HTTP-date form a proxy may rewrite it to', () => {
    const at = new Date(NOW + 45_000).toUTCString();
    expect(retryAfterSeconds(headers({ 'Retry-After': at }), NOW)).toBe(45);
  });

  it('never returns a negative wait for a date already past', () => {
    const at = new Date(NOW - 60_000).toUTCString();
    expect(retryAfterSeconds(headers({ 'Retry-After': at }), NOW)).toBe(0);
  });

  it('falls back to the RateLimit reset when Retry-After is absent', () => {
    // Retry-After is only set on the limited response; RateLimit rides on every
    // response, which is what lets a screen warn before the wall.
    expect(retryAfterSeconds(headers({ RateLimit: '"g"; r=0; t=12' }), NOW)).toBe(12);
  });

  it('returns null when nothing says how long to wait', () => {
    expect(retryAfterSeconds(headers({}), NOW)).toBeNull();
  });
});
