import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppShell } from '@/app/AppShell';
import { adminApi } from '@/api/endpoints';
import { getSession, hasSessionHint } from '@/api/session';

/**
 * The authentication wall, and the shell behind it.
 *
 * A PATHLESS layout (`_console`), so every screen under it keeps the §4 URL —
 * `/ops/players`, not `/console/ops/players`. The IA is the contract; this is
 * an implementation detail of where the guard lives.
 *
 * `/signin` and `/design` sit outside it deliberately. Sign-in obviously; the
 * design gallery because it is dev-and-preview tooling that renders specimens
 * and reads no data (§4), and putting it behind the wall would mean the
 * visual-regression suite has to authenticate to photograph a button.
 */
export const Route = createFileRoute('/_console')({
  /*
   * ── Restore before redirecting ─────────────────────────────────────────────
   * On a cold load the access token is gone — it lives in a module variable
   * that died with the last page (§7.4, deliberately). The httpOnly refresh
   * cookie did not, so the guard tries `restore()` before concluding that
   * nobody is signed in. Without this, every refresh of every screen bounces
   * the operator to sign-in and loses where they were.
   *
   * `beforeLoad` and not a component effect: an effect renders the screen
   * first, so the operator sees a flash of a dashboard they may not be allowed
   * to see, and any query it fired has already left.
   */
  async beforeLoad({ location }) {
    if (getSession() !== null) return;

    /*
     * No hint cookie means no refresh session, so there is nothing to restore
     * and no point asking. Skipping the request matters more than it looks:
     * `authLimiter` counts only FAILED `/auth/*` requests, twenty per IP per
     * fifteen minutes — so without this, twenty anonymous page loads from one
     * office would rate-limit sign-in for everybody behind that address.
     */
    if (!hasSessionHint()) {
      throw redirect({ to: '/signin', search: { redirect: location.href } });
    }

    try {
      await adminApi.auth.restore();
    } catch {
      throw redirect({
        to: '/signin',
        /*
         * Where they were going, so sign-in can send them back.
         *
         * `href` rather than `pathname`, so the search params survive — an
         * operator who followed a link to a filtered list must land on that
         * filtered list, not on its unfiltered default. §4 makes filter state
         * part of the URL precisely so a link like that is meaningful.
         */
        search: { redirect: location.href },
      });
    }
  },

  // `AppShell` renders the `<Outlet />` itself, in the one place the scroll
  // container and the skip-link target belong.
  component: AppShell,
});
