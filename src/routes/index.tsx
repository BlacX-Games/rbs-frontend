import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * `/` → `/insights`, per §4.
 *
 * A redirect in `beforeLoad` rather than a component that navigates on mount:
 * the latter renders an empty page, fires the effect, and navigates — so the
 * operator sees a flash of nothing and the browser records `/` in history,
 * which makes Back land on a page that immediately redirects forward again.
 *
 * Insights is the landing screen because it is the read-only one: it is the
 * only module every operator role can see, so a `support` account does not open
 * the console on a `ForbiddenState`.
 */
export const Route = createFileRoute('/')({
  beforeLoad() {
    throw redirect({ to: '/insights' });
  },
});
