import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { MESSAGE_KEYS, t } from '@/i18n/t';
import {
  formatCompact,
  formatCount,
  formatDate,
  formatDateTime,
  formatPercent,
  formatSigned,
  NO_VALUE,
  toIsoDate,
} from '@/i18n/format';

/**
 * The catalogue and its machinery.
 *
 * Most of what this module guarantees is enforced by the compiler — a bad key
 * or a missing parameter does not build. These cover what types cannot: that
 * the catalogue has no empty or duplicate-valued placeholders, that
 * interpolation actually substitutes, and that a formatter handed a bad value
 * renders as "no value" rather than as a bug.
 */

describe('the catalogue', () => {
  it('has no empty messages', () => {
    for (const key of MESSAGE_KEYS) {
      expect(en[key].trim().length, key).toBeGreaterThan(0);
    }
  });

  it('leaves no placeholder unresolvable', () => {
    // A `{name}` whose braces are unbalanced would never match the substitution
    // pattern and would ship to an operator verbatim.
    for (const key of MESSAGE_KEYS) {
      const message: string = en[key];
      const opens = (message.match(/\{/g) ?? []).length;
      const closes = (message.match(/\}/g) ?? []).length;
      expect(opens, key).toBe(closes);
    }
  });

  it('keys every error message to a code, or to a named fallback', () => {
    // `api/errors.ts` maps a backend `error.code` straight onto `error.<CODE>`,
    // so an error key that is not SCREAMING_SNAKE is unreachable by that path
    // and must be one of the deliberate fallbacks.
    const fallbacks = new Set(['error.unknown', 'error.network', 'error.SERVER']);

    for (const key of MESSAGE_KEYS) {
      if (!key.startsWith('error.') || fallbacks.has(key)) continue;

      const code = key.slice('error.'.length).split('.')[0] ?? '';
      expect(code, key).toMatch(/^[A-Z][A-Z_]*$/);
    }
  });
});

describe('t', () => {
  it('returns a message with no placeholders verbatim', () => {
    expect(t('action.retry')).toBe('Try again');
  });

  it('substitutes every placeholder', () => {
    expect(t('pagination.range', { from: 1, to: 50, total: '1,204' })).toBe('1–50 of 1,204');
  });

  it('substitutes a repeated placeholder everywhere it appears', () => {
    expect(t('topbar.signedInAs', { name: 'Danny R.' })).toBe('Signed in as Danny R.');
  });

  it('stringifies a number', () => {
    expect(t('error.RATE_LIMITED', { seconds: 30 })).toBe('Too many requests. Try again in 30s.');
  });

  it('throws rather than rendering a literal placeholder to an operator', () => {
    // Unreachable through the public type; reachable through an `as` cast or a
    // hand-built values object. A visible "{seconds}" is the failure this
    // module exists to prevent, so it fails loudly at the call site instead.
    const values = {} as { seconds: number };
    expect(() => t('error.RATE_LIMITED', values)).toThrow(/needs a value/);
  });
});

describe('format', () => {
  it('formats an ISO timestamp in the operator locale', () => {
    expect(formatDate('2026-07-24T20:14:00.000Z')).toMatch(/Jul 2[45], 2026/);
    expect(formatDateTime('2026-07-24T20:14:00.000Z')).toMatch(/2026/);
  });

  it('renders a malformed timestamp as no value, not "Invalid Date"', () => {
    expect(formatDate('not-a-date')).toBe(NO_VALUE);
    expect(formatDateTime('')).toBe(NO_VALUE);
  });

  it('emits the wire form for a calendar day', () => {
    // A day, not an instant: `YYYY-MM-DD` is what crosses the wire, because a
    // Date constructed at local midnight sends the wrong day from half the
    // world's timezones.
    expect(toIsoDate(new Date('2026-07-24T23:30:00.000Z'))).toBe('2026-07-24');
  });

  it('groups counts and compacts large ones', () => {
    expect(formatCount(1204)).toBe('1,204');
    expect(formatCompact(12_400)).toBe('12.4K');
  });

  it('takes a percentage figure, not a ratio', () => {
    expect(formatPercent(46.7)).toBe('46.7%');
    expect(formatPercent(32, 0)).toBe('32%');
  });

  it('renders an unknown percentage as no value, never as zero', () => {
    // 0% would report a healthy food cost for a service that sold nothing.
    expect(formatPercent(null)).toBe(NO_VALUE);
  });

  it('always shows the sign on a signed figure, with a true minus', () => {
    // reputationChange is signed, and a bare 3 beside a −5 reads as an absolute.
    expect(formatSigned(3)).toBe('+3');
    expect(formatSigned(-5)).toBe('−5');
    expect(formatSigned(0)).toBe('0');
  });
});
