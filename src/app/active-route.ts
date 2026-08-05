import { useMatches } from '@tanstack/react-router';
import { routeFor, type ConsoleRoute } from '@/app/navigation';

/**
 * The `navigation.ts` entry for the screen currently on show.
 *
 * Resolved from the ROUTER's deepest match rather than from `location.pathname`
 * — a pathname carries a real UUID where the route has `$playerId`, and would
 * never match the table. `fullPath` is the route's pattern, which is what the
 * table is keyed on.
 *
 * `undefined` for a route outside the shell (`/signin`, `/design`) or one added
 * to `src/routes/` without a table entry. Callers must treat that as "no
 * metadata", never as "no restrictions": `AppShell` gates on `ops.read` when
 * this returns nothing, so a forgotten table entry fails closed.
 */
export function useActiveConsoleRoute(): ConsoleRoute | undefined {
  const matches = useMatches();
  const active = matches.at(-1);

  if (active === undefined) return undefined;

  // The plugin emits a trailing slash on index routes (`/ops/`); the table
  // spells them without one, because that is the URL an operator types.
  return routeFor(active.fullPath.replace(/\/$/, '') || '/');
}
