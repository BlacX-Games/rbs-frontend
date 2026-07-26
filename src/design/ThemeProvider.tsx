import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
  getSystemTheme,
  persistDensity,
  persistTheme,
  readStoredDensity,
  readStoredTheme,
  stampDensity,
  stampTheme,
  subscribeToSystemTheme,
  type Density,
  type Theme,
} from '@/design/theme';
import { ThemeContext, type ThemeContextValue } from '@/design/theme-context';

/**
 * Owns the theme and density preferences for the whole console.
 *
 * The OS colour preference is an EXTERNAL STORE, so it is read with
 * `useSyncExternalStore` rather than mirrored into state by an effect. That
 * makes `resolvedTheme` a derived value — no cascading render on mount, and no
 * window in which the context reports a theme the DOM does not yet carry.
 *
 * State is seeded from storage, not from the DOM: the pre-paint script in
 * index.html stamps the *resolved* theme, which cannot tell `system` apart from
 * an explicit `dark`. Re-stamping on mount is idempotent — the attribute is
 * already correct, so nothing repaints.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [density, setDensityState] = useState<Density>(readStoredDensity);

  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getSystemTheme);

  // Only `system` tracks the OS. An explicit choice must survive the operator
  // changing their desktop theme — that is what §5.2's "wins in both
  // directions" means.
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => stampTheme(resolvedTheme), [resolvedTheme]);
  useEffect(() => stampDensity(density), [density]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    persistDensity(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, density, setDensity }),
    [theme, resolvedTheme, setTheme, density, setDensity],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
