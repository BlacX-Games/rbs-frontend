import { createContext, useContext } from 'react';
import type { Density, ResolvedTheme, Theme } from '@/design/theme';

/**
 * Split from `ThemeProvider.tsx` on purpose: `react-refresh/only-export-components`
 * fires on any module exporting both a component and a hook, and Fast Refresh
 * genuinely cannot preserve state across an edit to such a file. Components in
 * `.tsx`, the context and hooks beside them in `.ts`.
 */
export interface ThemeContextValue {
  /** What the operator chose — may be `system`. */
  readonly theme: Theme;
  /** What `data-theme` actually carries. Never `system`. */
  readonly resolvedTheme: ResolvedTheme;
  readonly setTheme: (theme: Theme) => void;
  readonly density: Density;
  readonly setDensity: (density: Density) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeContext(hook: string): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(`${hook} must be used inside <ThemeProvider>.`);
  }

  return context;
}

export function useTheme(): ThemeContextValue {
  return useThemeContext('useTheme');
}

export function useDensity(): Pick<ThemeContextValue, 'density' | 'setDensity'> {
  const { density, setDensity } = useThemeContext('useDensity');
  return { density, setDensity };
}
