import type {
  AdminApi,
  AuditQuery,
  ListQuery,
  PlayerQuery,
  RestaurantQuery,
  ReviewQuery,
  SessionQuery,
} from '@/api/adapter';
import { request, type QueryValue } from '@/api/client';
import { clearSession, setSession } from '@/api/session';
import { AuditEntrySchema, OperatorSchema, SessionResponseSchema } from '@/domain/schemas/admin';
import {
  OpsSummarySchema,
  PlayerDetailSchema,
  PlayerRowSchema,
  RestaurantDetailSchema,
  RestaurantRowSchema,
  ReviewRowSchema,
  ReviewSchema,
  ServiceSessionRowSchema,
  SessionDetailSchema,
} from '@/domain/schemas/ops';
import { pageOf } from '@/domain/schemas/primitives';
import type { ReviewPatch } from '@/domain/types';

/**
 * The one `AdminApi` implementation, over `api/client.ts`.
 *
 * Thin on purpose: each method is a path, a query, and the schema its response
 * is parsed through. Anything smarter — a cache, a retry, a transform — belongs
 * to TanStack Query above it or to the client below it, and putting it here is
 * how a "data layer" becomes the place bugs hide.
 *
 * One file rather than a module per resource. §7.2 sketches `api/endpoints/`,
 * and the plural earns its directory when a resource needs more than three
 * lines; today every method IS three lines, and eight files of three lines each
 * is a directory you have to search to read.
 */

/** Every list query flattens to the same §8.4 parameters, plus its own filters. */
function listParams(query: ListQuery): Record<string, QueryValue> {
  return {
    cursor: query.cursor,
    limit: query.limit,
    sort: query.sort,
    order: query.order,
    q: query.q,
  };
}

/** `signal` is only ever present on reads — a mutation must not be abandoned half-done. */
function read(signal: AbortSignal | undefined) {
  return signal === undefined ? {} : { signal };
}

export const adminApi: AdminApi = {
  auth: {
    async signIn(email, password) {
      const session = await request('/auth/session', {
        method: 'POST',
        body: { email, password },
        schema: SessionResponseSchema,
      });

      setSession(session.accessToken, session.operator, session.expiresIn, Date.now());
      return session;
    },

    /**
     * Cold-load restore. The access token died with the last page; the httpOnly
     * refresh cookie did not, so this is what turns a reload into a no-op for
     * the operator instead of a sign-in screen.
     *
     * Called with no session in memory, so `client.ts`'s 401 interceptor stays
     * out of the way and a 401 here surfaces as "not signed in".
     */
    async restore() {
      const session = await request('/auth/refresh', {
        method: 'POST',
        schema: SessionResponseSchema,
      });

      setSession(session.accessToken, session.operator, session.expiresIn, Date.now());
      return session.operator;
    },

    /**
     * Clears locally even if the server call fails.
     *
     * An operator who pressed "Sign out" on a flaky connection must not be left
     * signed in. The server-side revocation is the important half and it is
     * best-effort; the token expires in five minutes regardless (§8.2).
     */
    async signOut() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        clearSession();
      }
    },
  },

  ops: {
    summary() {
      return request('/ops/summary', { schema: OpsSummarySchema });
    },
  },

  players: {
    list(query: PlayerQuery, signal) {
      return request('/players', {
        query: {
          ...listParams(query),
          provider: query.provider,
          ageBracket: query.ageBracket,
          role: query.role,
          activeWithinDays: query.activeWithinDays,
          hasRestaurants: query.hasRestaurants,
        },
        schema: pageOf(PlayerRowSchema),
        ...read(signal),
      });
    },

    get(id, signal) {
      return request(`/players/${encodeURIComponent(id)}`, {
        schema: PlayerDetailSchema,
        ...read(signal),
      });
    },
  },

  restaurants: {
    list(query: RestaurantQuery, signal) {
      return request('/restaurants', {
        query: { ...listParams(query), playerId: query.playerId, conceptId: query.conceptId },
        schema: pageOf(RestaurantRowSchema),
        ...read(signal),
      });
    },

    get(id, signal) {
      return request(`/restaurants/${encodeURIComponent(id)}`, {
        schema: RestaurantDetailSchema,
        ...read(signal),
      });
    },
  },

  sessions: {
    list(query: SessionQuery, signal) {
      return request('/sessions', {
        query: {
          ...listParams(query),
          restaurantId: query.restaurantId,
          from: query.from,
          to: query.to,
          negativeProfit: query.negativeProfit,
        },
        schema: pageOf(ServiceSessionRowSchema),
        ...read(signal),
      });
    },

    get(id, signal) {
      return request(`/sessions/${encodeURIComponent(id)}`, {
        schema: SessionDetailSchema,
        ...read(signal),
      });
    },
  },

  reviews: {
    list(query: ReviewQuery, signal) {
      return request('/reviews', {
        query: {
          ...listParams(query),
          restaurantId: query.restaurantId,
          sessionId: query.sessionId,
          isFeatured: query.isFeatured,
          hasText: query.hasText,
          archetype: query.archetype,
        },
        schema: pageOf(ReviewRowSchema),
        ...read(signal),
      });
    },

    /**
     * The only mutation on this interface.
     *
     * `patch` is typed `ReviewPatch` — a strict object over `isFeatured` and
     * `reviewText`. §8.4 makes any other key a `VALIDATION_ERROR` server-side;
     * the type makes it unwritable client-side. Golden rule 2 is enforced in
     * both directions, which is the only way it holds.
     */
    patch(id, patch: ReviewPatch) {
      return request(`/reviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
        schema: ReviewSchema,
      });
    },
  },

  audit: {
    list(query: AuditQuery, signal) {
      return request('/audit', {
        query: {
          ...listParams(query),
          actorId: query.actorId,
          entityType: query.entityType,
          entityId: query.entityId,
        },
        schema: pageOf(AuditEntrySchema),
        ...read(signal),
      });
    },
  },
};

/** `GET /admin/v1/me`. Not on `AdminApi` — the shell reads it, not a screen. */
export function fetchOperator(signal?: AbortSignal) {
  return request('/me', { schema: OperatorSchema, ...read(signal) });
}
