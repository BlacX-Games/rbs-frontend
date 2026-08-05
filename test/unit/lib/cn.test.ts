import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

/**
 * `cn` is four lines, and the reason it has a test file is the one thing it
 * deliberately does NOT do.
 *
 * Every design system reaches a point where someone hits a class collision and
 * proposes `tailwind-merge`. The decision here was to keep `className` additive
 * and change appearance through props instead; the last case below pins that,
 * so the choice is visible as a failing test rather than rediscovered as a
 * surprise.
 */
describe('cn', () => {
  const CASES = [
    { parts: ['a', 'b'], expected: 'a b', why: 'joins with a single space' },
    { parts: ['a', undefined, 'b'], expected: 'a b', why: 'drops undefined' },
    { parts: ['a', null, 'b'], expected: 'a b', why: 'drops null' },
    { parts: ['a', false, 'b'], expected: 'a b', why: 'drops an unmet condition' },
    { parts: ['a', '', 'b'], expected: 'a b', why: 'drops an empty string' },
    { parts: ['  a  ', ' b '], expected: 'a b', why: 'trims each part' },
    { parts: ['a\n  b', 'c'], expected: 'a\n  b c', why: 'leaves inner whitespace alone' },
    { parts: ['   '], expected: '', why: 'drops a whitespace-only part' },
    { parts: [], expected: '', why: 'survives no arguments at all' },
    { parts: [false, null, undefined], expected: '', why: 'returns empty rather than "false"' },
  ] as const;

  it.each(CASES)('$why', ({ parts, expected }) => {
    expect(cn(...parts)).toBe(expected);
  });

  it('appends a colliding class rather than resolving it', () => {
    // THE decision, asserted. `tailwind-merge` would return 'p-16'; we return
    // both and let the cascade decide, because merging would need the library
    // taught about a theme with the stock palette deleted and --spacing at 1px,
    // and a mis-taught merge drops classes silently.
    //
    // If this test is failing because someone added tailwind-merge, that is a
    // design-system decision to reopen deliberately, not a test to update.
    expect(cn('p-8', 'p-16')).toBe('p-8 p-16');
  });

  it('emits nothing for a component with no caller className', () => {
    // The common call shape: base classes, an optional variant, then the
    // caller's className — which is usually absent. A trailing space here would
    // land in every rendered class attribute in the console.
    expect(cn('rounded-md', 'bg-gold', undefined)).toBe('rounded-md bg-gold');
  });
});
