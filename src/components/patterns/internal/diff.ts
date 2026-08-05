/**
 * A structural diff over the balancing JSON.
 *
 * `balancing.json` is 177 lines of nested tuning data that the docs say is meant
 * to be edited constantly, so the Studio's job is showing exactly what moved
 * between two versions. A line-based text diff would report a reformat as a
 * change and hide a real edit inside a reindented block; comparing by PATH
 * makes the answer independent of how the file happens to be printed.
 */

export type DiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffEntry {
  /** Dotted path — `reputation.gainFactor`, `tiers.0.dishCap`. */
  readonly path: string;
  readonly kind: DiffKind;
  /** Rendered for display. `undefined` where the side has no value. */
  readonly before: string | undefined;
  readonly after: string | undefined;
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Leaf values only, keyed by path. Arrays index by position. */
function flatten(value: Json, prefix = '', into = new Map<string, string>()): Map<string, string> {
  if (value === null || typeof value !== 'object') {
    // `null` is rendered rather than skipped: four of the nine balancing events
    // are null, and "this is unauthored" is exactly the fact the Studio's
    // authoring prompt keys off.
    into.set(prefix, JSON.stringify(value));
    return into;
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);

  if (entries.length === 0) {
    into.set(prefix, Array.isArray(value) ? '[]' : '{}');
    return into;
  }

  for (const [key, child] of entries) {
    flatten(child, prefix === '' ? key : `${prefix}.${key}`, into);
  }

  return into;
}

/**
 * Every path in either side, in a stable order.
 *
 * Sorted rather than insertion-ordered, so two versions whose keys were written
 * in different orders still line up — the reader is comparing values, not
 * serialization.
 */
export function diffJson(before: Json, after: Json): readonly DiffEntry[] {
  const left = flatten(before);
  const right = flatten(after);
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort();

  return paths.map((path) => {
    const a = left.get(path);
    const b = right.get(path);

    const kind: DiffKind =
      a === undefined ? 'added' : b === undefined ? 'removed' : a === b ? 'unchanged' : 'changed';

    return { path, kind, before: a, after: b };
  });
}

export function countChanges(entries: readonly DiffEntry[]): {
  readonly added: number;
  readonly removed: number;
  readonly changed: number;
} {
  return {
    added: entries.filter((entry) => entry.kind === 'added').length,
    removed: entries.filter((entry) => entry.kind === 'removed').length,
    changed: entries.filter((entry) => entry.kind === 'changed').length,
  };
}
