/**
 * The rail's collapsed/expanded preference.
 *
 * Persisted, and persisted the same way theme and density are (`src/design/
 * theme.ts`): the same guarded `localStorage` access, the same silent fallback
 * when storage throws in Safari private mode, the same `rbs.` key prefix. It is
 * an operator preference, not application state — someone who collapsed the
 * rail to read a fifty-column table wants it collapsed tomorrow too.
 *
 * NOT in `design/theme.ts` despite the symmetry: that module is duplicated by
 * the pre-paint script in `index.html` and pinned against it by a test. The
 * rail does not need to be stamped before first paint — it lives inside the
 * React tree and reflows nothing above the fold — so adding it there would
 * grow the one piece of logic in this repo that exists in two places.
 */

const RAIL_STORAGE_KEY = 'rbs.rail';

/** Expanded. §4's 240px, which is the state that shows the labels. */
export const DEFAULT_RAIL_COLLAPSED = false;

export function readStoredRailCollapsed(): boolean {
  try {
    return globalThis.localStorage.getItem(RAIL_STORAGE_KEY) === 'collapsed';
  } catch {
    return DEFAULT_RAIL_COLLAPSED;
  }
}

export function persistRailCollapsed(collapsed: boolean): void {
  try {
    globalThis.localStorage.setItem(RAIL_STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    /* Preference is not persisted; the session still works. */
  }
}
