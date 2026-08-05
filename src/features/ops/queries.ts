import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PlayerQuery } from '@/api/adapter';
import { adminApi } from '@/api/endpoints';
import { POLL, queryKeys } from '@/api/queries';
import type { OpsSummary, Page, PlayerDetail, PlayerRow } from '@/domain/types';

/**
 * The Live Ops queries.
 *
 * Thin wrappers, and deliberately so: they exist to bind a key from
 * `api/queries.ts` to a method on `AdminApi` and to name the polling interval,
 * so no screen constructs a cache key inline. A key written at the call site is
 * a key a mutation's invalidation will one day fail to match — silently,
 * because an invalidation that matches nothing is not an error.
 */

/**
 * The §6.1 home. Polls at the "live" interval — this is the screen an operator
 * leaves open on a second monitor during a busy service.
 */
export function useOpsSummary(): UseQueryResult<OpsSummary> {
  return useQuery({
    queryKey: queryKeys.ops.summary(),
    queryFn: ({ signal }) => adminApi.ops.summary(signal),
    refetchInterval: POLL.live,
  });
}

export function usePlayers(query: PlayerQuery): UseQueryResult<Page<PlayerRow>> {
  return useQuery({
    queryKey: queryKeys.players.list(query),
    queryFn: ({ signal }) => adminApi.players.list(query, signal),
    refetchInterval: POLL.list,
    /*
     * Keeps the previous page on screen while the next one loads.
     *
     * Without it, every filter keystroke and every page turn blanks the table
     * to a skeleton and back. `placeholderData` holds the old rows and marks
     * the query `isPlaceholderData`, which is what the `aria-busy` below reads
     * — so the screen stays legible and still announces that it is fetching.
     */
    placeholderData: (previous) => previous,
  });
}

export function usePlayer(playerId: string): UseQueryResult<PlayerDetail> {
  return useQuery({
    queryKey: queryKeys.players.detail(playerId),
    queryFn: ({ signal }) => adminApi.players.get(playerId, signal),
  });
}
