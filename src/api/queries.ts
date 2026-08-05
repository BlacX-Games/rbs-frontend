import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import type {
  AuditQuery,
  PlayerQuery,
  RestaurantQuery,
  ReviewQuery,
  SessionQuery,
} from '@/api/adapter';

/**
 * Query keys and the invalidation map.
 *
 * ── Why a factory and not inline arrays ─────────────────────────────────────
 * A key is a cache address. Written inline, `['players', filters]` in the list
 * and `['player', id]` in the detail are two conventions, and the first
 * mutation that has to invalidate both guesses one of them wrong — silently,
 * because an invalidation that matches nothing is not an error. Built here,
 * every key shares a prefix and a prefix invalidation cannot miss.
 */

/**
 * Everything the console caches sits under one root, so signing out can drop
 * the entire cache with a single prefix rather than an enumerated list that
 * grows stale — and leave one operator's data in memory for the next.
 */
const ROOT = ['admin'] as const;

export const queryKeys = {
  all: ROOT,

  /** The signed-in operator. Separate from `players`: a different concern. */
  me: () => [...ROOT, 'me'] as const,

  ops: {
    all: () => [...ROOT, 'ops'] as const,
    summary: () => [...ROOT, 'ops', 'summary'] as const,
  },

  players: {
    all: () => [...ROOT, 'players'] as const,
    /*
     * The query object is part of the key, so each filter combination caches
     * separately and going back to a filtered view is instant. It must be
     * SERIALIZABLE and STABLE — TanStack hashes it, and a key holding a
     * function or a fresh object literal per render never hits.
     */
    list: (query: PlayerQuery) => [...ROOT, 'players', 'list', query] as const,
    detail: (id: string) => [...ROOT, 'players', 'detail', id] as const,
  },

  restaurants: {
    all: () => [...ROOT, 'restaurants'] as const,
    list: (query: RestaurantQuery) => [...ROOT, 'restaurants', 'list', query] as const,
    detail: (id: string) => [...ROOT, 'restaurants', 'detail', id] as const,
  },

  sessions: {
    all: () => [...ROOT, 'sessions'] as const,
    list: (query: SessionQuery) => [...ROOT, 'sessions', 'list', query] as const,
    detail: (id: string) => [...ROOT, 'sessions', 'detail', id] as const,
  },

  reviews: {
    all: () => [...ROOT, 'reviews'] as const,
    list: (query: ReviewQuery) => [...ROOT, 'reviews', 'list', query] as const,
  },

  audit: {
    all: () => [...ROOT, 'audit'] as const,
    list: (query: AuditQuery) => [...ROOT, 'audit', 'list', query] as const,
  },
};

/**
 * What a write invalidates.
 *
 * Declared as data rather than written at each mutation, because the
 * non-obvious entries are the ones that get forgotten. Moderating a review
 * changes the review lists — and it also changes the Ops home count of reviews
 * awaiting moderation, and it writes an audit row. A `useMutation` that
 * invalidates only what it obviously touched leaves two screens quietly wrong.
 *
 * Keys are PREFIXES: invalidating `['admin','reviews']` catches every filter
 * combination of the review list without enumerating them.
 */
export const INVALIDATES: Readonly<Record<string, readonly (readonly string[])[]>> = {
  'review.moderate': [queryKeys.reviews.all(), queryKeys.ops.all(), queryKeys.audit.all()],
};

export type WriteAction = keyof typeof INVALIDATES;

/**
 * Polling intervals (§7.4, §12), in milliseconds.
 *
 * There is no realtime layer and §13 defers one deliberately, so polling is the
 * substitute. The numbers are authored: fast enough that an operator watching
 * Live Ops sees a service land, slow enough that thirty idle tabs do not become
 * the backend's largest client.
 */
export const POLL = {
  /** Ops home and System health — the screens someone leaves open. */
  live: 15_000,
  /** Lists, where a row appearing 60s late costs nothing. */
  list: 60_000,
} as const;

/* ── The query client ────────────────────────────────────────────────────── */

/**
 * The TanStack Query client, with the console's defaults.
 *
 * Every default here is a decision about how a dashboard should behave when the
 * network disagrees with the screen — and the shipped defaults are tuned for a
 * consumer app, not an operator console.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /*
         * Do not retry a 4xx.
         *
         * The library retries three times by default, which is right for a
         * flaky connection and wrong for a 403: the request was refused, and
         * sending it twice more turns one honest "you may not" into three, adds
         * two seconds before the operator sees it, and — on a 429 — spends the
         * budget that caused the limit in the first place.
         */
        retry: (failureCount, error) => {
          if (error instanceof ApiError) return error.isRetryable && failureCount < 2;
          return failureCount < 2;
        },

        /*
         * Polling pauses on a hidden tab.
         *
         * An operator with the console open in a background tab for a working
         * day is otherwise 2,000 requests the backend serves to nobody. The
         * refetch on focus below is what makes that safe: the moment the tab
         * comes back, the data does.
         */
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,

        /*
         * Ten seconds, not zero.
         *
         * Zero — the library default — refetches on every mount, so opening a
         * peek drawer and closing it re-fetches the list behind it. Ten seconds
         * is short enough that a returning operator sees current data and long
         * enough that navigating within a screen is instant.
         */
        staleTime: 10_000,
      },

      mutations: {
        // Never automatic. A retried mutation is a second write, and every
        // write in this console produces an audit row (golden rule 7) — a
        // retry would record an action the operator took once as two.
        retry: false,
      },
    },
  });
}
