import type {
  AuditEntry,
  Operator,
  OpsSummary,
  Page,
  PlayerDetail,
  PlayerRow,
  RestaurantDetail,
  RestaurantRow,
  Review,
  ReviewPatch,
  ReviewRow,
  ServiceSessionRow,
  SessionDetail,
  SessionResponse,
} from '@/domain/types';
import type { AgeBracket, Archetype, AuthProvider, Role } from '@/domain/enums';

/**
 * `AdminApi` — the single seam between the console and its data (§7.3).
 *
 * ── What it is for, given there is only one implementation ──────────────────
 * Not swappability: MSW intercepts `fetch`, so mock and live mode run the same
 * code and no second implementation exists. It is a NAMED CONTRACT — the list
 * of everything the console asks the backend for, in one file, in domain terms
 * rather than URLs. `rbs-backend` has no `/admin/v1` and no plan for one, so
 * this doubles as the work-order that repo will be handed, and a route added
 * here without a matching handler and fixture is visible immediately.
 *
 * ── Scope ───────────────────────────────────────────────────────────────────
 * Live Ops (§6.1) and audit, complete. Catalogue, balancing, and insights are
 * deliberately ABSENT rather than declared and unimplemented: a method with no
 * handler behind it is a promise the type system makes and the network breaks,
 * and each of those modules lands with the phase that specifies it (§9).
 *
 * ── What may be written, and what may never be ──────────────────────────────
 * There is exactly one mutation on this interface — `reviews.patch` — and its
 * body type is `ReviewPatch`, a strict object over `isFeatured` and
 * `reviewText`. Golden rule 2 says no admin screen may write a score, rating,
 * or payout; here that is not a convention anyone has to remember, it is the
 * absence of a method to call.
 */

/** Every list takes these. §8.4: `?cursor&limit&sort&order&q`. */
export interface ListQuery {
  /** Opaque; comes from the previous page's `nextCursor`. Never constructed. */
  readonly cursor?: string;
  /** §12: default 50, max 200. */
  readonly limit?: number;
  readonly sort?: string;
  readonly order?: 'asc' | 'desc';
  /** Free-text search. Which columns it covers is per-resource. */
  readonly q?: string;
}

export interface PlayerQuery extends ListQuery {
  readonly provider?: AuthProvider;
  readonly ageBracket?: AgeBracket;
  readonly role?: Role;
  /** Active within the last N days — the §6.1 "activity window" filter. */
  readonly activeWithinDays?: number;
  readonly hasRestaurants?: boolean;
}

export interface RestaurantQuery extends ListQuery {
  readonly playerId?: string;
  readonly conceptId?: string;
}

export interface SessionQuery extends ListQuery {
  readonly restaurantId?: string;
  /** `YYYY-MM-DD`, inclusive. A day, never an instant. */
  readonly from?: string;
  readonly to?: string;
  /** The §6.1 anomaly filter: services that lost money. */
  readonly negativeProfit?: boolean;
}

export interface ReviewQuery extends ListQuery {
  readonly restaurantId?: string;
  readonly sessionId?: string;
  readonly isFeatured?: boolean;
  readonly hasText?: boolean;
  readonly archetype?: Archetype;
}

export interface AuditQuery extends ListQuery {
  readonly actorId?: string;
  readonly entityType?: string;
  readonly entityId?: string;
}

/*
 * The three detail shapes are inferred from schemas in `domain/schemas/ops.ts`
 * rather than declared here, for the same reason every other wire type is: the
 * parser and the type must be one definition, or a field rename leaves a type
 * that compiles against data the parser rejects.
 */

export interface AdminApi {
  readonly auth: {
    signIn(email: string, password: string): Promise<SessionResponse>;
    /** Restores a session from the httpOnly cookie on a cold load. */
    restore(): Promise<Operator>;
    signOut(): Promise<void>;
  };

  readonly ops: {
    /** The §6.1 home: today's figures, the recent feed, and the anomaly strip. */
    summary(): Promise<OpsSummary>;
  };

  readonly players: {
    list(query: PlayerQuery, signal?: AbortSignal): Promise<Page<PlayerRow>>;
    get(id: string, signal?: AbortSignal): Promise<PlayerDetail>;
  };

  readonly restaurants: {
    list(query: RestaurantQuery, signal?: AbortSignal): Promise<Page<RestaurantRow>>;
    get(id: string, signal?: AbortSignal): Promise<RestaurantDetail>;
  };

  readonly sessions: {
    list(query: SessionQuery, signal?: AbortSignal): Promise<Page<ServiceSessionRow>>;
    get(id: string, signal?: AbortSignal): Promise<SessionDetail>;
  };

  readonly reviews: {
    list(query: ReviewQuery, signal?: AbortSignal): Promise<Page<ReviewRow>>;
    /** The one mutation. `ReviewPatch` is strict over two fields — see above. */
    patch(id: string, patch: ReviewPatch): Promise<Review>;
  };

  readonly audit: {
    list(query: AuditQuery, signal?: AbortSignal): Promise<Page<AuditEntry>>;
  };
}
