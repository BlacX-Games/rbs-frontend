/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately NOT `tailwind-merge`. Consumer `className` is additive: it is
 * appended, and a class that collides with one the component owns is resolved
 * by the cascade, not by us. Anything a caller is meant to change is a prop.
 *
 * Real merging would need `tailwind-merge` taught about a theme where the stock
 * palette is deleted, the radius and shadow scales are replaced, and `--spacing`
 * is 1px so `p-16` means sixteen pixels. A mis-configured merge drops classes
 * silently, which is a worse failure than a collision a developer can see.
 *
 * No object or array forms either — `cn({ 'bg-gold': isActive })` invites
 * building class strings from data at runtime, and a design system whose classes
 * cannot be found with `grep` cannot be audited. The `[…].join(' ')` idiom in
 * `ThemeControls.tsx` stays the norm for static lists; this exists only to admit
 * a conditional and the caller's `className` without emitting a literal `false`
 * into the DOM.
 *
 * The parameter spells `undefined` out rather than relying on optionality,
 * because `exactOptionalPropertyTypes` makes a destructured `className?: string`
 * carry it.
 */
export function cn(...parts: readonly (string | false | null | undefined)[]): string {
  const kept: string[] = [];

  for (const part of parts) {
    if (!part) continue;

    // Trimming matters because the array-of-concerns idiom produces multi-line
    // template strings whose parts arrive padded; an untrimmed empty string
    // would join into a double space and, worse, a leading one.
    const trimmed = part.trim();
    if (trimmed) kept.push(trimmed);
  }

  return kept.join(' ');
}
