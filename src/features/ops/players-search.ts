import { z } from 'zod';
import type { PlayerQuery } from '@/api/adapter';
import { AGE_BRACKETS, AUTH_PROVIDERS } from '@/domain/enums';

/**
 * The `/ops/players` URL contract.
 *
 * ── Why the filters live in the URL ────────────────────────────────────────
 * §4: "All filter, sort, and pagination state lives in typed URL search params,
 * so any filtered view is a link." That is the whole reason §7.1 chose TanStack
 * Router. An operator who finds something worth escalating pastes the address
 * bar into Slack and the next person sees exactly what they saw — rather than a
 * screenshot and a list of controls to re-set by hand.
 *
 * ── Validated at the route boundary ───────────────────────────────────────
 * A URL is user input: an operator edits it, a link rots, a bookmark predates a
 * filter being renamed. Parsing here removes the class of bug where a bad
 * parameter reaches a query as `undefined` and quietly changes what the screen
 * is showing.
 *
 * `.catch()` on every field rather than `.optional()` alone, so a malformed
 * value DROPS to unset instead of failing the whole route. A stale bookmark
 * should show an unfiltered list, not an error page.
 */

/** Sortable columns. A closed set: the server orders only what it has indexed. */
export const PLAYER_SORTS = ['username', 'createdAt', 'lastActive', 'restaurantCount'] as const;

export type PlayerSort = (typeof PLAYER_SORTS)[number];

/** The §6.1 "activity window" filter, as the three windows it offers. */
export const ACTIVITY_WINDOWS = [7, 30, 90] as const;

export const PlayersSearchSchema = z.object({
  q: z.string().min(1).optional().catch(undefined),
  provider: z.enum(AUTH_PROVIDERS).optional().catch(undefined),
  ageBracket: z.enum(AGE_BRACKETS).optional().catch(undefined),
  activeWithinDays: z
    .union([z.literal(7), z.literal(30), z.literal(90)])
    .optional()
    .catch(undefined),
  hasRestaurants: z.boolean().optional().catch(undefined),
  sort: z.enum(PLAYER_SORTS).optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
  /**
   * Opaque, and never constructed by this app — it comes from the previous
   * page's `nextCursor`. In the URL so a refresh stays on the page the operator
   * was reading rather than snapping back to the first.
   */
  cursor: z.string().min(1).optional().catch(undefined),
  /**
   * The player open in the peek drawer.
   *
   * In the URL because a peek is a VIEW, and §4 wants every view linkable. It
   * also means closing the drawer is a history entry, so Back closes it — which
   * is what a browser user expects and what a component-state drawer gets wrong.
   */
  peek: z.string().min(1).optional().catch(undefined),
});

export type PlayersSearch = z.infer<typeof PlayersSearchSchema>;

/**
 * URL → the `AdminApi` query.
 *
 * `peek` is deliberately absent from the result: which row is open in a drawer
 * is a view concern, and including it would make the drawer part of the cache
 * key — so opening one would refetch the entire list.
 */
export function toPlayerQuery(search: PlayersSearch): PlayerQuery {
  return {
    ...(search.q === undefined ? {} : { q: search.q }),
    ...(search.provider === undefined ? {} : { provider: search.provider }),
    ...(search.ageBracket === undefined ? {} : { ageBracket: search.ageBracket }),
    ...(search.activeWithinDays === undefined ? {} : { activeWithinDays: search.activeWithinDays }),
    ...(search.hasRestaurants === undefined ? {} : { hasRestaurants: search.hasRestaurants }),
    ...(search.sort === undefined ? {} : { sort: search.sort }),
    ...(search.order === undefined ? {} : { order: search.order }),
    ...(search.cursor === undefined ? {} : { cursor: search.cursor }),
  };
}

/** How many filters are on, for the clear button. Sort and paging are not filters. */
export function activeFilterCount(search: PlayersSearch): number {
  return [
    search.q,
    search.provider,
    search.ageBracket,
    search.activeWithinDays,
    search.hasRestaurants,
  ].filter((value) => value !== undefined).length;
}
