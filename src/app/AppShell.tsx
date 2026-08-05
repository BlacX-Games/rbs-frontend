import { Outlet } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { NavRail } from '@/app/NavRail';
import { RequireCapability } from '@/app/RequireCapability';
import { TopBar } from '@/app/TopBar';
import { useActiveConsoleRoute } from '@/app/active-route';
import { persistRailCollapsed, readStoredRailCollapsed } from '@/app/rail';
import { env } from '@/lib/env';
import { t } from '@/i18n/t';

/**
 * The chrome every console screen sits inside: rail, top bar, content.
 *
 * ── The `<main id="main">` here is the skip link's target ───────────────────
 * `__root.tsx` renders the skip link, and it points at this element. Keeping
 * the link at the root and the target here is deliberate: the link must be the
 * first focusable node in the document, and the target must be the start of the
 * content that changes between routes. Putting both in one file would mean
 * either a skip link inside the shell (so it is not first) or a `<main>` at the
 * root (so it wraps the rail, and skipping lands you before the navigation you
 * were trying to skip).
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(readStoredRailCollapsed);
  const route = useActiveConsoleRoute();

  const changeCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    persistRailCollapsed(next);
  }, []);

  return (
    <div className="bg-canvas flex h-dvh">
      <NavRail collapsed={collapsed} onCollapsedChange={changeCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        {/*
          The scroll container is here, not on the body: the rail and top bar
          stay put while a fifty-thousand-row table scrolls under them, which is
          what `DataTable`'s sticky header assumes.
        */}
        <main className="min-h-0 flex-1 overflow-y-auto px-24 py-24" id="main">
          {/*
            Mock mode says so, once, in the chrome rather than on each screen.
            An operator reading plausible revenue figures is entitled to know
            they came from a fixture — and §11 step 8 has a reviewer flipping
            between modes, where a silent switch is genuinely confusing.
          */}
          {env.useMocks ? (
            <p className="border-rule bg-raised text-ink-secondary mb-16 rounded-md border px-12 py-8 text-xs">
              <span className="text-ink font-medium">{t('topbar.mockData')}</span>{' '}
              {t('topbar.mockData.detail')}
            </p>
          ) : null}

          {/*
            Role gating happens HERE, once, from the same table that builds the
            rail — rather than as a wrapper each of the forty route files has to
            remember. The fortieth is where someone forgets, and a route that
            forgets is a screen open to every role.

            `?? 'ops.read'` is the fail-closed default: a route file added
            without a `navigation.ts` entry gets the weakest real capability
            rather than none, so the mistake shows up as a `ForbiddenState` for
            an analyst instead of as an ungated screen.
          */}
          <RequireCapability capability={route?.capability ?? 'ops.read'}>
            <Outlet />
          </RequireCapability>
        </main>
      </div>
    </div>
  );
}
