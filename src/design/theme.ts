/**
 * Theme and density preferences — §5.2 "Theme mechanics" and §5.4 "Density".
 *
 * Two independent axes, both persisted per user:
 *   theme    dark | light | system   → stamps `data-theme` on <html>
 *   density  comfortable | compact   → stamps `data-density` on <html>
 *
 * `src/design/tokens.css` reads only the two *resolved* theme values, so
 * `system` is resolved here and never reaches the DOM. That keeps the CSS to
 * one selector per theme instead of a media query wrapped around every rule.
 *
 * ── The inversion, and why it is deliberate ─────────────────────────────────
 * The OS query is `prefers-color-scheme: LIGHT`, not `dark`. §5.2 names the
 * dark query, but the same section marks dark the default and index.html ships
 * `color-scheme: dark light`; both cannot hold. Dark is the default, so the
 * query that can move a user off it is the light one. tokens.css inverts the
 * same way — the two MUST agree, or a cold load flashes the wrong theme.
 *
 * ── This logic is duplicated in index.html ──────────────────────────────────
 * A pre-paint inline script has to stamp both attributes before first paint or
 * the page flashes the wrong theme; it cannot wait for the module graph.
 * `test/unit/design/theme.test.ts` runs that script and these functions against
 * the same stubs and asserts identical output, so the copy cannot drift.
 */

export const THEMES = ['dark', 'light', 'system'] as const;
export type Theme = (typeof THEMES)[number];

/** What actually reaches `data-theme`. `system` resolves to one of these. */
export type ResolvedTheme = Exclude<Theme, 'system'>;

export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = (typeof DENSITIES)[number];

export const THEME_STORAGE_KEY = 'rbs.theme';
export const DENSITY_STORAGE_KEY = 'rbs.density';

/** Dark is the product default — see the note above. */
export const DEFAULT_THEME: Theme = 'system';
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = 'dark';

/** Comfortable is the accessible default: 44px is the GDD's tap-target floor. */
export const DEFAULT_DENSITY: Density = 'comfortable';

/** Matches when the OS asks for the paper theme. Inverted on purpose. */
export const LIGHT_PREFERENCE_QUERY = '(prefers-color-scheme: light)';

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

function isDensity(value: unknown): value is Density {
  return DENSITIES.includes(value as Density);
}

/**
 * Storage access can throw outright — Safari private mode, and any browser
 * where the operator has blocked site data. A console that will not render
 * because it could not read a cosmetic preference is worse than one that
 * quietly falls back.
 */
function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    /* Preference is not persisted; the session still works. */
  }
}

export function readStoredTheme(): Theme {
  const stored = readStorage(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function readStoredDensity(): Density {
  const stored = readStorage(DENSITY_STORAGE_KEY);
  return isDensity(stored) ? stored : DEFAULT_DENSITY;
}

/** Collapses `system` against the OS preference. `dark` and `light` pass through. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme;

  // Absent in a bare jsdom document; fall back rather than throw.
  const query = globalThis.matchMedia?.(LIGHT_PREFERENCE_QUERY);
  if (!query) return DEFAULT_RESOLVED_THEME;

  return query.matches ? 'light' : 'dark';
}

/*
 * Persisting and stamping are separate on purpose.
 *
 * Bundling them into one `applyTheme()` forced the provider to call setState
 * from inside an effect to learn the resolved value back — which React 19's
 * `react-hooks/set-state-in-effect` rejects outright, and rightly: it is a
 * cascading render. Split, persistence belongs to the event handler and
 * stamping to an effect, and the resolved theme is derived during render.
 */

export function persistTheme(theme: Theme): void {
  writeStorage(THEME_STORAGE_KEY, theme);
}

export function persistDensity(density: Density): void {
  writeStorage(DENSITY_STORAGE_KEY, density);
}

export function stampTheme(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved);
}

export function stampDensity(density: Density): void {
  document.documentElement.setAttribute('data-density', density);
}

/**
 * Subscribes to the OS colour preference. Module-scoped and argument-free so
 * the reference stays stable across renders, which `useSyncExternalStore`
 * requires — an inline closure here would resubscribe on every render.
 */
export function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = globalThis.matchMedia?.(LIGHT_PREFERENCE_QUERY);
  if (!query) return () => {};

  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function getSystemTheme(): ResolvedTheme {
  return resolveTheme('system');
}
