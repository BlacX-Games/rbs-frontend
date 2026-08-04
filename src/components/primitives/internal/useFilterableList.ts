import { useCallback, useState } from 'react';

/**
 * The machinery Combobox, MultiSelect, and CommandPalette all need.
 *
 * A `.ts`, so it holds the hook and the matcher but no components — the split
 * `react-refresh/only-export-components` requires.
 */

/**
 * Case- and diacritic-insensitive.
 *
 * The diacritic half is not decoration: the catalogue holds "Crème Brûlée" and
 * "Jalapeño", and an operator typing `creme` on a UK keyboard must find the
 * first. Stripping combining marks after NFD is the standard way to do that
 * without shipping a collation table.
 */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Substring match across every field given — label, description, keywords. */
export function matchesQuery(query: string, ...fields: readonly string[]): boolean {
  const needle = normalize(query.trim());

  if (needle === '') return true;

  return fields.some((field) => normalize(field).includes(needle));
}

export interface ActiveOption {
  /** `-1` when the list is empty — there is nothing to be active. */
  readonly activeIndex: number;
  readonly setActiveIndex: (index: number) => void;
  /** Wraps at both ends, as the APG listbox pattern expects. */
  readonly move: (delta: number) => void;
  readonly moveTo: (edge: 'first' | 'last') => void;
}

/**
 * Which option the ARIA combobox pattern calls "active".
 *
 * Not focus. In an editable combobox, focus stays in the input the whole time
 * and `aria-activedescendant` points at the highlighted option — moving real
 * focus into the list would take the caret out of the field the operator is
 * still typing in.
 *
 * `resetKey` collapses the active option back to the top whenever the query
 * changes: keeping index 3 after the list has been re-filtered highlights
 * whatever happens to be third now, which is a different thing than the
 * operator was looking at.
 */
export function useActiveOption({
  count,
  resetKey,
}: {
  readonly count: number;
  readonly resetKey: string;
}): ActiveOption {
  const [index, setIndex] = useState(0);
  const [lastKey, setLastKey] = useState(resetKey);

  if (resetKey !== lastKey) {
    // Derived during render rather than in an effect: an effect would paint one
    // frame with the stale highlight, and React 19's set-state-in-effect rule
    // rejects it anyway.
    setLastKey(resetKey);
    setIndex(0);
  }

  // Clamped on read rather than on write, because `count` changes underneath us
  // as the query narrows — an index stored as valid can stop being so without
  // anything calling a setter.
  const activeIndex = count === 0 ? -1 : Math.min(index, count - 1);

  const move = useCallback(
    (delta: number) => {
      setIndex((current) => {
        if (count === 0) return 0;

        const from = Math.min(current, count - 1);
        return (from + delta + count) % count;
      });
    },
    [count],
  );

  const moveTo = useCallback(
    (edge: 'first' | 'last') => {
      setIndex(edge === 'first' ? 0 : Math.max(count - 1, 0));
    },
    [count],
  );

  return { activeIndex, setActiveIndex: setIndex, move, moveTo };
}
