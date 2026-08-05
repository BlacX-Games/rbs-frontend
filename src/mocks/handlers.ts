import { HttpResponse, http, type HttpHandler, type PathParams } from 'msw';
import type { Capability } from '@/lib/permissions';
import { can } from '@/lib/permissions';
import { env } from '@/lib/env';
import { sumMoney, toMinorUnits } from '@/lib/money';
import { SESSION_HINT_COOKIE } from '@/api/session';
import type { Operator, OpsAlert, Review } from '@/domain/types';
import { MOCK_OPERATORS, universe } from '@/mocks/fixtures';
import { FIXTURE_NOW } from '@/mocks/random';

/**
 * The `/admin/v1` surface, as a mock.
 *
 * ── This file is the work-order ─────────────────────────────────────────────
 * `rbs-backend` has no admin API and no phase that promises one. So these
 * handlers are not a placeholder for a specification — they ARE the
 * specification, executable, and the thing that repo will be handed. Where they
 * cut a corner they say so, rather than quietly making the mock easier to serve
 * than the real thing would be.
 *
 * ── They enforce the role matrix, and that is the point ─────────────────────
 * A mock that answers every request regardless of role would let the console
 * ship a rail that hides what it should and a route that opens what it should
 * not, with nothing to catch either. Here a `support` token really does get a
 * 403 from `PATCH /reviews/:id`'s neighbours, so §11 step 2 — "sign in as each
 * of the five roles and confirm gating" — is a test rather than an inspection.
 */

const BASE = `${env.apiBaseUrl}/admin/v1`;

/* ── Session ─────────────────────────────────────────────────────────────── */

/**
 * The mock's stand-in for the httpOnly refresh cookie (§8.3).
 *
 * A real one is set by the server with `HttpOnly; SameSite=Strict; Secure`, and
 * this bundle could not read it. A mock running IN the page cannot set that
 * flag — only a server can — so the cookie here is readable by script. That is
 * the one place the mock is weaker than the contract, and it is called out
 * rather than hidden: the property being simulated is "survives a reload
 * without JavaScript holding a long-lived credential", and this does that.
 *
 * NOT `localStorage`, deliberately. §11 step 6 asks a reviewer to open DevTools
 * and confirm no token is in web storage; a mock that parked one there would
 * fail an audit it was supposed to help pass.
 */
const REFRESH_COOKIE = 'rbs_admin_refresh';

/**
 * Set and cleared in lockstep with the refresh cookie, exactly as the real
 * backend must (§8.3, extended). The console reads this — never the refresh
 * cookie — to decide whether a cold load is worth a restore attempt.
 */
function writeSessionCookies(playerId: string | null): void {
  const maxAge = playerId === null ? 0 : REFRESH_TTL_SECONDS;
  writeCookie(REFRESH_COOKIE, playerId ?? '', maxAge);
  writeCookie(SESSION_HINT_COOKIE, playerId === null ? '' : '1', maxAge);
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(document.cookie);
  return match?.[1] === undefined ? null : decodeURIComponent(match[1]);
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${String(maxAgeSeconds)}; SameSite=Strict`;
}

/** §8.2: 300s for an admin, against the game client's 900. */
const ACCESS_TTL_SECONDS = 300;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 60;

/** Opaque to the console, structured here so a handler can resolve the operator. */
function mintAccessToken(operator: Operator): string {
  return `mock.${operator.id}`;
}

function operatorFromToken(token: string | null): Operator | null {
  if (token === null || !token.startsWith('mock.')) return null;

  const id = token.slice('mock.'.length);
  return MOCK_OPERATORS.find((operator) => operator.id === id) ?? null;
}

function bearerOperator(request: Request): Operator | null {
  const header = request.headers.get('authorization');
  if (header === null || !header.startsWith('Bearer ')) return null;

  return operatorFromToken(header.slice('Bearer '.length).trim());
}

/* ── Envelopes ───────────────────────────────────────────────────────────── */

/** `middleware/errorHandler.ts:26-32`, reproduced exactly. */
function fail(status: number, code: string, message: string, details?: unknown): Response {
  return HttpResponse.json(
    {
      error: {
        message,
        ...(code === '' ? {} : { code }),
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

const UNAUTHENTICATED = (): Response => fail(401, 'UNAUTHENTICATED', 'Missing bearer token');

const FORBIDDEN = (): Response => fail(403, 'FORBIDDEN', 'Your role does not permit this action');

const NOT_FOUND = (): Response => fail(404, 'NOT_FOUND', 'No such record');

/**
 * Wraps a handler in the two checks every `/admin/v1` route shares.
 *
 * Composed rather than repeated, for the same reason `requireAuth` is Express
 * middleware and not a line at the top of each route: the twentieth handler is
 * where someone forgets.
 */
function guarded(
  capability: Capability | null,
  handler: (input: {
    operator: Operator;
    url: URL;
    request: Request;
    params: PathParams;
  }) => Response | Promise<Response>,
) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    const operator = bearerOperator(request);
    if (operator === null) return UNAUTHENTICATED();

    // A `player` token is a valid credential for a console it may not enter —
    // 403, not 401. The difference matters: 401 sends the operator back to
    // sign in, and they would sign in as the same player again, forever.
    if (capability !== null && !can(operator.role, capability)) return FORBIDDEN();

    return handler({ operator, url: new URL(request.url), request, params });
  };
}

/* ── Listing ─────────────────────────────────────────────────────────────── */

/** §12: default 50, max 200. */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function param(url: URL, name: string): string | null {
  const value = url.searchParams.get(name);
  return value === null || value === '' ? null : value;
}

function boolParam(url: URL, name: string): boolean | null {
  const value = param(url, name);
  return value === null ? null : value === 'true';
}

/**
 * Cursor pagination over an in-memory array.
 *
 * The cursor is an opaque base64 OFFSET, and that is a real simplification: a
 * production cursor must be keyset — `WHERE (sort_key, id) > (:key, :id)` — or
 * it repeats and skips rows under concurrent writes, which is the whole reason
 * §12 chose cursors over pages. It is sound here only because this dataset is
 * immutable for the life of the page. Named `cursor` and opaque to the console
 * so the swap to a real keyset changes nothing above this line.
 */
function paginate<T>(rows: readonly T[], url: URL): Response {
  const limit = Math.min(Number(param(url, 'limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = param(url, 'cursor');
  const offset = cursor === null ? 0 : Number.parseInt(atob(cursor), 10) || 0;

  const items = rows.slice(offset, offset + limit);
  const nextOffset = offset + items.length;

  return HttpResponse.json({
    items,
    nextCursor: nextOffset < rows.length ? btoa(String(nextOffset)) : null,
    total: rows.length,
  });
}

/** Sorts a copy, never the fixture array — the universe is immutable. */
function sorted<T>(
  rows: readonly T[],
  url: URL,
  allowed: Readonly<Record<string, (row: T) => string | number | null>>,
): readonly T[] {
  const key = param(url, 'sort');
  const read = key === null ? undefined : allowed[key];
  if (read === undefined) return rows;

  const direction = param(url, 'order') === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = read(a);
    const right = read(b);

    // Nulls last regardless of direction. A column sorted descending that opens
    // with forty empty cells has told the operator nothing.
    if (left === null) return 1;
    if (right === null) return -1;
    if (left === right) return 0;

    return left < right ? -direction : direction;
  });
}

function matches(query: string | null, ...fields: readonly (string | null)[]): boolean {
  if (query === null) return true;

  const needle = query.toLowerCase();
  return fields.some((field) => field !== null && field.toLowerCase().includes(needle));
}

/* ── Derived views ───────────────────────────────────────────────────────── */

const conceptById = new Map(universe.concepts.map((concept) => [concept.id, concept]));
const playerById = new Map(universe.players.map((player) => [player.id, player]));
const restaurantById = new Map(
  universe.restaurants.map((restaurant) => [restaurant.id, restaurant]),
);
const guestById = new Map(universe.guests.map((guest) => [guest.id, guest]));

const restaurantCountByPlayer = new Map<string, number>();
for (const restaurant of universe.restaurants) {
  restaurantCountByPlayer.set(
    restaurant.playerId,
    (restaurantCountByPlayer.get(restaurant.playerId) ?? 0) + 1,
  );
}

const reviewCountBySession = new Map<string, number>();
for (const review of universe.reviews) {
  reviewCountBySession.set(review.sessionId, (reviewCountBySession.get(review.sessionId) ?? 0) + 1);
}

/**
 * Moderation edits, held OUTSIDE the fixture universe.
 *
 * A handler that mutated `universe.reviews` would make the demo drift from its
 * seed — and, worse, let one Vitest file's moderation change what the next file
 * reads. An overlay keyed by id keeps the universe pristine and makes
 * `resetMocks()` a one-line `clear()`.
 */
const reviewEdits = new Map<string, Partial<Review>>();

function withEdits(review: Review): Review {
  const edit = reviewEdits.get(review.id);
  return edit === undefined ? review : { ...review, ...edit };
}

function reviewRow(review: Review) {
  const guest = guestById.get(review.guestId);
  const restaurant = guest === undefined ? undefined : restaurantById.get(guest.restaurantId);

  return {
    ...withEdits(review),
    guestName: guest?.name ?? 'Unknown guest',
    guestArchetype: guest?.archetype ?? 'Regular',
    restaurantId: restaurant?.id ?? '',
    restaurantName: restaurant?.name ?? 'Unknown venue',
  };
}

function playerRow(player: (typeof universe.players)[number]) {
  return {
    ...player,
    restaurantCount: restaurantCountByPlayer.get(player.id) ?? 0,
    providers: universe.identityProviders.get(player.id) ?? [],
  };
}

function restaurantRow(restaurant: (typeof universe.restaurants)[number]) {
  return {
    ...restaurant,
    conceptName: conceptById.get(restaurant.conceptId)?.name ?? 'Unknown concept',
    ownerUsername: playerById.get(restaurant.playerId)?.username ?? null,
  };
}

function restaurantSummary(restaurant: (typeof universe.restaurants)[number]) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    conceptName: conceptById.get(restaurant.conceptId)?.name ?? 'Unknown concept',
    reputationScore: restaurant.reputationScore,
    totalRevenue: restaurant.totalRevenue,
    totalServicesRun: restaurant.totalServicesRun,
  };
}

function sessionRow(session: (typeof universe.sessions)[number]) {
  return {
    ...session,
    restaurantName: restaurantById.get(session.restaurantId)?.name ?? 'Unknown venue',
    reviewCount: reviewCountBySession.get(session.id) ?? 0,
  };
}

/* ── Handlers ────────────────────────────────────────────────────────────── */

export const handlers: readonly HttpHandler[] = [
  /* Auth */

  http.post(`${BASE}/auth/session`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const operator = MOCK_OPERATORS.find(
      (candidate) => candidate.email === body.email && candidate.password === body.password,
    );

    // Unknown email and wrong password return the SAME envelope, mirroring
    // `services/auth/password.ts`. Distinguishing them is an account-enumeration
    // oracle, and it is just as much one in a mock a reviewer reads.
    if (operator === undefined) {
      return fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    writeSessionCookies(operator.id);

    return HttpResponse.json({
      accessToken: mintAccessToken(operator),
      expiresIn: ACCESS_TTL_SECONDS,
      operator: {
        id: operator.id,
        email: operator.email,
        username: operator.username,
        role: operator.role,
      },
    });
  }),

  http.post(`${BASE}/auth/refresh`, () => {
    const id = readCookie(REFRESH_COOKIE);
    const operator =
      id === null ? undefined : MOCK_OPERATORS.find((candidate) => candidate.id === id);

    if (operator === undefined) {
      return fail(401, 'INVALID_REFRESH_TOKEN', 'No valid refresh credential');
    }

    // Rotation, as the real flow does. The value does not change here because
    // there is nothing to steal, but the cookie's lifetime is extended — which
    // is the behaviour an operator feels.
    writeSessionCookies(operator.id);

    return HttpResponse.json({
      accessToken: mintAccessToken(operator),
      expiresIn: ACCESS_TTL_SECONDS,
      operator: {
        id: operator.id,
        email: operator.email,
        username: operator.username,
        role: operator.role,
      },
    });
  }),

  http.post(`${BASE}/auth/logout`, () => {
    writeSessionCookies(null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(
    `${BASE}/me`,
    guarded(null, ({ operator }) => HttpResponse.json(operator)),
  ),

  /* Ops home */

  http.get(
    `${BASE}/ops/summary`,
    guarded('ops.read', () => {
      const dayStart = new Date(FIXTURE_NOW).toISOString().slice(0, 10);
      const today = universe.sessions.filter((session) => session.date.startsWith(dayStart));

      const scored = today.filter((session) => session.averageSatisfaction !== null);
      const satisfaction =
        scored.length === 0
          ? null
          : Math.round(
              scored.reduce((total, session) => total + (session.averageSatisfaction ?? 0), 0) /
                scored.length,
            );

      const alerts: OpsAlert[] = [];

      for (const session of today) {
        if (session.profit.startsWith('-')) {
          alerts.push({
            kind: 'negativeProfit',
            id: `alert-profit-${session.id}`,
            at: session.date,
            restaurantId: session.restaurantId,
            restaurantName: restaurantById.get(session.restaurantId)?.name ?? 'Unknown venue',
            sessionId: session.id,
            profit: session.profit,
          });
        }

        if (session.healthInspectionResult === 'Fail') {
          alerts.push({
            kind: 'failedInspection',
            id: `alert-inspection-${session.id}`,
            at: session.date,
            restaurantId: session.restaurantId,
            restaurantName: restaurantById.get(session.restaurantId)?.name ?? 'Unknown venue',
            sessionId: session.id,
            result: session.healthInspectionResult,
          });
        }
      }

      // Morale in balancing.json's "Burnt Out" band, 0–19.
      const burntOut = new Map<string, number>();
      for (const member of universe.staff) {
        if (member.morale > 19 || !member.isActive) continue;
        burntOut.set(member.restaurantId, (burntOut.get(member.restaurantId) ?? 0) + 1);
      }

      for (const [restaurantId, staffCount] of burntOut) {
        alerts.push({
          kind: 'burntOutStaff',
          id: `alert-morale-${restaurantId}`,
          at: new Date(FIXTURE_NOW).toISOString(),
          restaurantId,
          restaurantName: restaurantById.get(restaurantId)?.name ?? 'Unknown venue',
          staffCount,
        });
      }

      const recent = [...universe.sessions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8)
        .map(sessionRow);

      return HttpResponse.json({
        asOf: new Date(FIXTURE_NOW).toISOString(),
        today: {
          sessions: today.length,
          covers: today.reduce((total, session) => total + session.coversServed, 0),
          revenue: today.length === 0 ? '0' : sumMoney(today.map((session) => session.revenue)),
          averageSatisfaction: satisfaction,
          reviewsAwaitingModeration: universe.reviews.filter(
            (review) => !withEdits(review).isFeatured && withEdits(review).reviewText !== null,
          ).length,
        },
        recentSessions: recent,
        alerts: alerts.slice(0, 12),
      });
    }),
  ),

  /* Players */

  http.get(
    `${BASE}/players`,
    guarded('ops.read', ({ url }) => {
      const q = param(url, 'q');
      const provider = param(url, 'provider');
      const ageBracket = param(url, 'ageBracket');
      const role = param(url, 'role');
      const activeWithinDays = param(url, 'activeWithinDays');
      const hasRestaurants = boolParam(url, 'hasRestaurants');

      const rows = universe.players.map(playerRow).filter((row) => {
        if (!matches(q, row.username, row.email, row.id)) return false;
        if (provider !== null && !row.providers.includes(provider as 'device')) return false;
        if (ageBracket !== null && row.ageBracket !== ageBracket) return false;
        if (role !== null && row.role !== role) return false;
        if (hasRestaurants !== null && row.restaurantCount > 0 !== hasRestaurants) return false;

        if (activeWithinDays !== null) {
          const cutoff = FIXTURE_NOW - Number(activeWithinDays) * 86_400_000;
          if (Date.parse(row.lastActive) < cutoff) return false;
        }

        return true;
      });

      return paginate(
        sorted(rows, url, {
          username: (row) => row.username,
          createdAt: (row) => row.createdAt,
          lastActive: (row) => row.lastActive,
          restaurantCount: (row) => row.restaurantCount,
        }),
        url,
      );
    }),
  ),

  http.get(
    `${BASE}/players/:id`,
    guarded('ops.read', ({ params }) => {
      const id = String(params['id']);
      const player = playerById.get(id);
      if (player === undefined) return NOT_FOUND();

      const owned = universe.restaurants.filter((restaurant) => restaurant.playerId === id);
      const ownedIds = new Set(owned.map((restaurant) => restaurant.id));

      return HttpResponse.json({
        player: playerRow(player),
        // `provider · createdAt · lastUsedAt` and nothing else. `subjectHash`
        // is absent by construction — the backend's own export path excludes
        // it, and a hash of an identity is still an identifier (§6.1).
        identities: (universe.identityProviders.get(id) ?? []).map((provider) => ({
          provider,
          createdAt: player.createdAt,
          lastUsedAt: player.lastActive,
        })),
        restaurants: owned.map(restaurantSummary),
        recentSessions: universe.sessions
          .filter((session) => ownedIds.has(session.restaurantId))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-20),
      });
    }),
  ),

  /* Restaurants */

  http.get(
    `${BASE}/restaurants`,
    guarded('ops.read', ({ url }) => {
      const q = param(url, 'q');
      const playerId = param(url, 'playerId');
      const conceptId = param(url, 'conceptId');

      const rows = universe.restaurants.map(restaurantRow).filter((row) => {
        if (!matches(q, row.name, row.ownerUsername, row.conceptName)) return false;
        if (playerId !== null && row.playerId !== playerId) return false;
        if (conceptId !== null && row.conceptId !== conceptId) return false;
        return true;
      });

      return paginate(
        sorted(rows, url, {
          name: (row) => row.name,
          reputationScore: (row) => row.reputationScore,
          totalServicesRun: (row) => row.totalServicesRun,
          createdAt: (row) => row.createdAt,
        }),
        url,
      );
    }),
  ),

  http.get(
    `${BASE}/restaurants/:id`,
    guarded('ops.read', ({ params }) => {
      const id = String(params['id']);
      const restaurant = restaurantById.get(id);
      if (restaurant === undefined) return NOT_FOUND();

      return HttpResponse.json({
        restaurant: restaurantRow(restaurant),
        dishes: universe.dishes.filter((dish) => dish.restaurantId === id),
        drinks: universe.drinks.filter((drink) => drink.restaurantId === id),
        staff: universe.staff.filter((member) => member.restaurantId === id),
        ambience: universe.ambience.find((entry) => entry.restaurantId === id) ?? null,
        guests: universe.guests.filter((guest) => guest.restaurantId === id),
      });
    }),
  ),

  /* Sessions */

  http.get(
    `${BASE}/sessions`,
    guarded('ops.read', ({ url }) => {
      const q = param(url, 'q');
      const restaurantId = param(url, 'restaurantId');
      const from = param(url, 'from');
      const to = param(url, 'to');
      const negativeProfit = boolParam(url, 'negativeProfit');

      const rows = universe.sessions.map(sessionRow).filter((row) => {
        if (!matches(q, row.restaurantName)) return false;
        if (restaurantId !== null && row.restaurantId !== restaurantId) return false;
        // `YYYY-MM-DD` compared as a prefix of the ISO instant — a day, not an
        // instant, so a session at 23:50 belongs to the day it started.
        if (from !== null && row.date.slice(0, 10) < from) return false;
        if (to !== null && row.date.slice(0, 10) > to) return false;
        if (negativeProfit !== null && row.profit.startsWith('-') !== negativeProfit) return false;
        return true;
      });

      return paginate(
        sorted(rows, url, {
          date: (row) => row.date,
          coversServed: (row) => row.coversServed,
          // Sorted on exact minor units, never on the string: a lexical sort
          // puts "9" above "18". `Number` of a bigint is safe here because a
          // Decimal(12,2) tops out ten orders of magnitude below 2^53.
          revenue: (row) => Number(toMinorUnits(row.revenue)),
          profit: (row) => Number(toMinorUnits(row.profit)),
          averageSatisfaction: (row) => row.averageSatisfaction,
        }),
        url,
      );
    }),
  ),

  http.get(
    `${BASE}/sessions/:id`,
    guarded('ops.read', ({ params }) => {
      const id = String(params['id']);
      const session = universe.sessions.find((candidate) => candidate.id === id);
      if (session === undefined) return NOT_FOUND();

      const restaurant = restaurantById.get(session.restaurantId);
      if (restaurant === undefined) return NOT_FOUND();

      return HttpResponse.json({
        session: sessionRow(session),
        restaurant: restaurantSummary(restaurant),
        reviews: universe.reviews
          .filter((review) => review.sessionId === session.id)
          .map(reviewRow),
        // Derived server-side. The console must never compute a reputation,
        // only display the two the sim produced (golden rule 2).
        reputationBefore: Math.max(
          0,
          Math.min(100, restaurant.reputationScore - session.reputationChange),
        ),
      });
    }),
  ),

  /* Reviews */

  http.get(
    `${BASE}/reviews`,
    guarded('ops.read', ({ url }) => {
      const q = param(url, 'q');
      const restaurantId = param(url, 'restaurantId');
      const sessionId = param(url, 'sessionId');
      const isFeatured = boolParam(url, 'isFeatured');
      const hasText = boolParam(url, 'hasText');
      const archetype = param(url, 'archetype');

      const rows = universe.reviews.map(reviewRow).filter((row) => {
        if (!matches(q, row.reviewText, row.guestName, row.restaurantName)) return false;
        if (restaurantId !== null && row.restaurantId !== restaurantId) return false;
        if (sessionId !== null && row.sessionId !== sessionId) return false;
        if (isFeatured !== null && row.isFeatured !== isFeatured) return false;
        if (hasText !== null && (row.reviewText !== null) !== hasText) return false;
        if (archetype !== null && row.guestArchetype !== archetype) return false;
        return true;
      });

      return paginate(
        sorted(rows, url, {
          createdAt: (row) => row.createdAt,
          overallScore: (row) => row.overallScore,
        }),
        url,
      );
    }),
  ),

  http.patch(
    `${BASE}/reviews/:id`,
    guarded('reviews.moderate', async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;

      /*
       * Golden rule 2, enforced server-side as well as in the type.
       *
       * §8.4: "PATCH /reviews/:id accepts ONLY isFeatured and reviewText. Any
       * other key is a VALIDATION_ERROR." The client's `ReviewPatch` is a
       * strict object, so this is unreachable from our own code — which is
       * exactly why it is here. A rule enforced only by the caller is a rule
       * enforced by nobody, and this handler is the specification the backend
       * will implement.
       *
       * BEFORE the lookup, deliberately: `validateBody` is Express middleware
       * on the backend and runs ahead of the route handler, so a malformed body
       * is a 400 whether or not the id exists. Checking existence first would
       * also turn the status code into an oracle for which ids are real.
       */
      const allowed = new Set(['isFeatured', 'reviewText']);
      const rejected = Object.keys(body).filter((key) => !allowed.has(key));

      if (rejected.length > 0) {
        return fail(
          400,
          'VALIDATION_ERROR',
          'Request body failed validation',
          rejected.map((key) => ({ path: key, message: 'Unrecognized key' })),
        );
      }

      const id = String(params['id']);
      const review = universe.reviews.find((candidate) => candidate.id === id);
      if (review === undefined) return NOT_FOUND();

      const edit: Partial<Review> = {};
      if (typeof body['isFeatured'] === 'boolean') edit.isFeatured = body['isFeatured'];
      if (typeof body['reviewText'] === 'string' || body['reviewText'] === null) {
        edit.reviewText = body['reviewText'];
      }

      reviewEdits.set(id, { ...reviewEdits.get(id), ...edit });

      return HttpResponse.json(withEdits(review));
    }),
  ),

  /* Audit */

  http.get(
    `${BASE}/audit`,
    // AUTHORED: §8.2 has no audit column. Gated on `ops.read` rather than
    // `admin.manage` because support staff need to see that their own GDPR
    // action was recorded — the trail is evidence for the actor as much as
    // oversight of them. Worth confirming with whoever holds `owner` (§14).
    guarded('ops.read', ({ url }) => {
      const actorId = param(url, 'actorId');
      const entityType = param(url, 'entityType');
      const entityId = param(url, 'entityId');

      const rows = universe.audit.filter((entry) => {
        if (actorId !== null && entry.actorId !== actorId) return false;
        if (entityType !== null && entry.entityType !== entityType) return false;
        if (entityId !== null && entry.entityId !== entityId) return false;
        return true;
      });

      return paginate(sorted(rows, url, { createdAt: (entry) => entry.createdAt }), url);
    }),
  ),
];

/**
 * Drops moderation edits and the refresh cookie.
 *
 * For Vitest: without it, a suite that features a review and a suite that
 * counts featured reviews pass or fail depending on file order.
 */
export function resetMockState(): void {
  reviewEdits.clear();
  writeSessionCookies(null);
}
