import { Outlet, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/api/QueryProvider';
import { ErrorState } from '@/components/patterns/states';
import { ToastProvider } from '@/components/primitives/Toast';
import { TooltipProvider } from '@/components/primitives/Tooltip';
import { ThemeProvider } from '@/design/ThemeProvider';
import { t } from '@/i18n/t';

/**
 * The document root: providers, the skip link, and the crash boundary.
 *
 * ── The providers moved here from App.tsx, as Phase 1 predicted ─────────────
 * Its comment said so: "Both providers are app-level, not gallery-level —
 * Tooltip shares hover timing across every trigger beneath it, and Toast has to
 * outlive whichever screen raised the message. Phase 2 hoists them to the
 * router root, where they belong once one exists." This is that.
 *
 * `QueryProvider` joins them for the same reason: a cache scoped to a route
 * would be discarded on navigation, which is the opposite of what a cache is.
 */
function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider closeLabel={t('toast.dismiss')} viewportLabel={t('toast.viewport')}>
          <TooltipProvider>
            {/*
              §5.6 requires a skip link, and it must be FIRST in the DOM — the
              only position that makes it useful. It targets `#main`, which
              `AppShell` renders; on `/signin` and `/design` there is no rail to
              skip, and the link simply lands on the page's own `#main`.
            */}
            <a
              className={[
                'sr-only focus:not-sr-only',
                'focus:bg-raised focus:text-ink focus:border-rule focus:fixed focus:top-8 focus:left-8',
                'focus:z-50 focus:rounded-md focus:border focus:px-16 focus:py-8',
              ].join(' ')}
              href="#main"
            >
              {t('app.skipToContent')}
            </a>

            {children}
          </TooltipProvider>
        </ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  ),

  /*
   * A render crash, caught at the root.
   *
   * Distinct from `ErrorState` shown by a screen whose query failed: that is
   * data not arriving, and it is recoverable by retrying. This is our code
   * throwing, and the tree below is gone — so it must render OUTSIDE that tree,
   * which is why it cannot be a component inside a route.
   *
   * Wrapped in the providers, because the fallback still needs the theme: an
   * unstyled white page in a dark-theme console reads as a browser error, not
   * as ours.
   */
  errorComponent: () => (
    <RootLayout>
      <main className="bg-canvas flex min-h-dvh items-center justify-center p-24" id="main">
        <ErrorState
          className="max-w-lg"
          description={t('state.crash.description')}
          title={t('state.crash.title')}
        />
      </main>
    </RootLayout>
  ),

  /*
   * An unmatched URL.
   *
   * Rendered without the shell on purpose. A 404 inside the rail invites the
   * reading that the screen exists and is empty; outside it, "that URL is not a
   * screen" is unambiguous — and the rail is one click away on any route that
   * is real.
   */
  notFoundComponent: () => (
    <RootLayout>
      <main className="bg-canvas flex min-h-dvh items-center justify-center p-24" id="main">
        <ErrorState
          className="max-w-lg"
          description={t('state.notFound.description')}
          title={t('state.notFound.title')}
        />
      </main>
    </RootLayout>
  ),
});
