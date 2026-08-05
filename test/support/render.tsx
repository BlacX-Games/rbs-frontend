import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ThemeProvider } from '@/design/ThemeProvider';
import type { Density, Theme } from '@/design/theme';

/**
 * Renders a component inside the providers the console always supplies.
 *
 * Every interactive primitive reads theme or density somewhere in its tree, so
 * a bare `render()` throws "must be used inside <ThemeProvider>". Centralising
 * that here means stage 2's 28 primitives and stage 3's patterns get one import
 * instead of a wrapper copied into every file — and when Phase 2 adds the query
 * client and router, exactly one file changes.
 */

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Seeds `localStorage` before mount, so the provider starts in this theme. */
  readonly theme?: Theme;
  readonly density?: Density;
}

export function renderWithProviders(
  ui: ReactElement,
  { theme, density, ...options }: RenderWithProvidersOptions = {},
): RenderResult {
  // The provider seeds itself from storage on mount, which is also how the real
  // app starts — so a test that forces a theme exercises the same path an
  // operator does rather than a test-only override.
  if (theme) localStorage.setItem('rbs.theme', theme);
  if (density) localStorage.setItem('rbs.density', density);

  function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
