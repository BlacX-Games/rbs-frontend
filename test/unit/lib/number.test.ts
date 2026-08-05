import { describe, expect, it } from 'vitest';
import { clamp, clampScore, roundHalfUp, toDisplayScore, toPercent } from '@/lib/number';

describe('roundHalfUp', () => {
  it('sends a positive tie up', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(82.5)).toBe(83);
  });

  it('sends a negative tie AWAY FROM ZERO', () => {
    // The whole reason this module exists. Unity's ScoreRounding.ToDisplay uses
    // MidpointRounding.AwayFromZero, so −2.5 is −3. `Math.round(-2.5)` is −2,
    // and `Math.round(-0.5)` is −0 — a value that stringifies as "0", compares
    // equal to 0, and serializes as -0 in some encoders.
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(-0.5)).toBe(-1);
    expect(Math.round(-2.5)).toBe(-2);
  });

  it('never returns negative zero', () => {
    // `Object.is` is the only comparison that can tell -0 from 0.
    expect(Object.is(roundHalfUp(-0.2), 0)).toBe(true);
    expect(Object.is(roundHalfUp(-0), 0)).toBe(true);
    expect(Object.is(Math.round(-0.2), 0)).toBe(false);
  });

  it('treats float noise around a tie as the tie', () => {
    // A weighted sum of 0–100 integers against two-decimal weights lands on
    // x.4999999999999996 often enough that raw rounding would send a tie down.
    // 82.80000000000001 is the canon CQS golden value, and the Unity harness
    // asserts it displays as 83.
    expect(roundHalfUp(82.80000000000001)).toBe(83);
    expect(roundHalfUp(0.49999999999999994)).toBe(1);
  });

  it('leaves a non-tie alone in both directions', () => {
    expect(roundHalfUp(2.49)).toBe(2);
    expect(roundHalfUp(-2.49)).toBe(-2);
    expect(roundHalfUp(2.51)).toBe(3);
    expect(roundHalfUp(-2.51)).toBe(-3);
  });

  it('refuses a non-finite value rather than propagating it', () => {
    expect(() => roundHalfUp(Number.NaN)).toThrow(TypeError);
    expect(() => roundHalfUp(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe('clamping', () => {
  it('holds the 0–100 score band', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(105)).toBe(100);
    expect(clampScore(74)).toBe(74);
  });

  it('rounds before clamping, like Unity ToDisplayClamped', () => {
    expect(toDisplayScore(99.5)).toBe(100);
    expect(toDisplayScore(100.4)).toBe(100);
    expect(toDisplayScore(-0.6)).toBe(0);
  });

  it('refuses NaN rather than clamping it to a bound', () => {
    // Math.min/max with NaN returns NaN, which would flow on as a score.
    expect(() => clamp(Number.NaN, 0, 100)).toThrow(TypeError);
  });
});

describe('toPercent', () => {
  it('scales a ratio to a percentage figure', () => {
    expect(toPercent(0.467)).toBe(46.7);
    expect(toPercent(0.32)).toBe(32);
    expect(toPercent(0.1234, 2)).toBe(12.34);
  });

  it('passes null through', () => {
    // The backend's computeEconomy returns null for a percentage whose revenue
    // base is zero, rather than Infinity or NaN. Turning that into 0% would
    // report a healthy food cost for a service that sold nothing.
    expect(toPercent(null)).toBeNull();
    expect(toPercent(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
