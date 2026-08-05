import { z } from 'zod';
import { AGE_BRACKETS, AI_TIERS, ARCHETYPES, AUTH_PROVIDERS, ROLES } from '@/domain/enums';
import { AmbienceSchema, DishSchema, DrinkSchema, StaffSchema } from '@/domain/schemas/catalog';
import {
  IsoDateTimeSchema,
  MoneySchema,
  ScoreSchema,
  UuidSchema,
} from '@/domain/schemas/primitives';

/**
 * The operational graph: Player, Restaurant, Guest, ServiceSession, Review.
 *
 * These are the entities Live Ops READS. Almost nothing here is writable —
 * golden rule 2 puts every score, rating, and money field on a session
 * permanently out of reach, because they are outputs of a deterministic sim
 * whose golden-value harness an admin override would silently invalidate. The
 * two exceptions in the whole graph are `Review.isFeatured` and
 * `Review.reviewText`, and §8.4 narrows the PATCH body to exactly those two.
 */

/* ── Player ──────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:138-167`, plus the authored `role` (§8.1).
 *
 * `email` is the only plaintext PII in the entire schema. Golden rule 6 makes
 * it visible only on the Player detail screen, only to a role holding
 * `gdpr.act`, masked by default, and audited on view. The field is nullable
 * because anonymous device play carries none — and a `null` email is the
 * normal case, not a missing one.
 *
 * `ageBracket` is a BRACKET and never a date of birth: the backend deliberately
 * never stored one, so there is no birthday for this console to leak.
 */
export const PlayerSchema = z.object({
  id: UuidSchema,
  username: z.string().nullable(),
  email: z.email().nullable(),
  ageBracket: z.enum(AGE_BRACKETS).nullable(),
  ageGateAt: IsoDateTimeSchema.nullable(),
  aiTier: z.enum(AI_TIERS),
  role: z.enum(ROLES),
  createdAt: IsoDateTimeSchema,
  lastActive: IsoDateTimeSchema,
});

/**
 * What a list row needs beyond the record itself (§6.1).
 *
 * `providers` is a glyph row, so it carries the provider names and nothing
 * else. `AuthIdentity.subjectHash` — the peppered HMAC of the OAuth subject —
 * is absent by construction here and in the detail below: the backend's own
 * export path excludes it, and a hash of an identity is still an identifier.
 */
export const PlayerRowSchema = PlayerSchema.extend({
  restaurantCount: z.int().min(0),
  providers: z.array(z.enum(AUTH_PROVIDERS)),
});

/** `provider · createdAt · lastUsedAt`, exactly what §6.1's identity panel lists. */
export const AuthIdentitySummarySchema = z.object({
  provider: z.enum(AUTH_PROVIDERS),
  createdAt: IsoDateTimeSchema,
  lastUsedAt: IsoDateTimeSchema,
});

/* ── Restaurant ──────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:186-219`.
 *
 * `priceLevel` is a nullable free-text `String` seeded `'$$'` while
 * `Concept.priceBracket` is a proper enum — §1.3 flags the overlap and
 * recommends deriving one from the other. Both are surfaced, and `priceLevel`
 * renders with a `DecisionFlag` until that is settled.
 *
 * `cleanliness` / `freshness` / `handling` are the hygiene triad, each a
 * `HealthMeter`. `reputationScore` and `totalRevenue` are sim outputs.
 */
export const RestaurantSchema = z.object({
  id: UuidSchema,
  playerId: UuidSchema,
  conceptId: UuidSchema,
  name: z.string(),
  priceLevel: z.string().nullable(),
  targetAudience: z.string().nullable(),
  reputationScore: ScoreSchema,
  totalRevenue: MoneySchema,
  totalServicesRun: z.int().min(0),
  cleanliness: ScoreSchema,
  freshness: ScoreSchema,
  handling: ScoreSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

/** Denormalized for the list, so a table of 500 rows is one request, not 501. */
export const RestaurantRowSchema = RestaurantSchema.extend({
  conceptName: z.string(),
  ownerUsername: z.string().nullable(),
});

/** Just enough to link to it from a player's detail screen. */
export const RestaurantSummarySchema = z.object({
  id: UuidSchema,
  name: z.string(),
  conceptName: z.string(),
  reputationScore: ScoreSchema,
  totalRevenue: MoneySchema,
  totalServicesRun: z.int().min(0),
});

/* ── Guest ───────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:320-341`. `satisfactionHistory` is a Postgres `Int[]` and
 * feeds the per-guest sparkline; `specialOccasions` is an unauthored JSONB, so
 * it stays `unknown` rather than being given a shape nobody has agreed to.
 */
export const GuestSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  name: z.string(),
  archetype: z.enum(ARCHETYPES),
  visitCount: z.int().min(0),
  favoriteDishId: UuidSchema.nullable(),
  favoriteDrinkId: UuidSchema.nullable(),
  satisfactionHistory: z.array(ScoreSchema),
  specialOccasions: z.unknown().nullable(),
  isRegular: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

/* ── ServiceSession ──────────────────────────────────────────────────────── */

/**
 * `schema.prisma:343-365`. Append-only — the model has no `updatedAt`, and
 * neither does this console: there is no route that edits a service.
 *
 * Every money field is `Decimal(12,2)` and therefore a string.
 * `averageSatisfaction` is nullable (a service with no guests scored nobody);
 * `reputationChange` is a SIGNED integer, and is the one field in the entire
 * schema where this repo's away-from-zero rounding could disagree with the
 * backend's toward-+∞ rounding — see `lib/number.ts`.
 */
export const ServiceSessionSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  date: IsoDateTimeSchema,
  coversServed: z.int().min(0),
  revenue: MoneySchema,
  foodCost: MoneySchema,
  beverageCost: MoneySchema,
  laborCost: MoneySchema,
  profit: MoneySchema,
  averageSatisfaction: ScoreSchema.nullable(),
  reputationChange: z.int(),
  eventsTriggered: z.array(z.string()),
  healthInspectionResult: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ServiceSessionRowSchema = ServiceSessionSchema.extend({
  restaurantName: z.string(),
  reviewCount: z.int().min(0),
});

/* ── Review ──────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:369-388`. Immutable in the sim — no `updatedAt` — and the only
 * entity the AI ever writes, and then only `reviewText` and `isFeatured`.
 *
 * `dishRatings` / `drinkRatings` are unauthored JSONB. Typed as a map of id →
 * score because that is what the column comment implies and what the seed would
 * produce, but `catchall` rather than a closed shape: guessing a strict shape
 * for a column no code writes yet would reject the first real row.
 *
 * Every `*Rating` and `overallScore` here renders READ-ONLY AND VISIBLY LOCKED
 * (§6.1). They are sim outputs; golden rule 2 has no exception for moderation.
 */
export const ReviewSchema = z.object({
  id: UuidSchema,
  sessionId: UuidSchema,
  guestId: UuidSchema,
  dishRatings: z.record(z.string(), ScoreSchema).nullable(),
  drinkRatings: z.record(z.string(), ScoreSchema).nullable(),
  serviceRating: ScoreSchema.nullable(),
  ambienceRating: ScoreSchema.nullable(),
  overallScore: ScoreSchema.nullable(),
  reviewText: z.string().nullable(),
  isFeatured: z.boolean(),
  createdAt: IsoDateTimeSchema,
});

/** Guest and restaurant context, so the moderation queue reads without a join per row. */
export const ReviewRowSchema = ReviewSchema.extend({
  guestName: z.string(),
  guestArchetype: z.enum(ARCHETYPES),
  restaurantId: UuidSchema,
  restaurantName: z.string(),
});

/**
 * The ONLY writable shape on a Review, and the type system is where golden
 * rule 2 is enforced.
 *
 * `z.strictObject` mirrors §8.4: "any other key is a `VALIDATION_ERROR`". A
 * non-strict object would let `{ overallScore: 100 }` ride along silently, and
 * the request would be rejected by a server that does not exist yet.
 */
export const ReviewPatchSchema = z
  .strictObject({
    isFeatured: z.boolean().optional(),
    reviewText: z.string().nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'A review patch must change something',
  });

/* ── Detail responses ────────────────────────────────────────────────────── */

/**
 * One request per screen, not one per panel.
 *
 * A detail route that fires six queries shows six independent spinners and six
 * independent failures, and the operator watches the page assemble itself. The
 * backend joins once; the console renders once.
 */
export const PlayerDetailSchema = z.object({
  player: PlayerRowSchema,
  identities: z.array(AuthIdentitySummarySchema),
  restaurants: z.array(RestaurantSummarySchema),
  /** Oldest first, so the sparkline reads left to right without a re-sort. */
  recentSessions: z.array(ServiceSessionSchema),
});

export const RestaurantDetailSchema = z.object({
  restaurant: RestaurantRowSchema,
  dishes: z.array(DishSchema),
  drinks: z.array(DrinkSchema),
  staff: z.array(StaffSchema),
  ambience: AmbienceSchema.nullable(),
  guests: z.array(GuestSchema),
});

export const SessionDetailSchema = z.object({
  session: ServiceSessionRowSchema,
  restaurant: RestaurantSummarySchema,
  reviews: z.array(ReviewRowSchema),
  /**
   * Reputation before this service ran, so `reputationChange` has somewhere to
   * start. Derived server-side: the console must never compute a reputation,
   * only display the two the sim produced (golden rule 2).
   */
  reputationBefore: ScoreSchema,
});

/* ── Ops home (§6.1) ─────────────────────────────────────────────────────── */

/**
 * The anomaly strip, as DATA rather than as sentences.
 *
 * The obvious shape is `{ message: string }`, and it is wrong twice: it ships
 * untranslated English from the server, and it puts copy in a layer with no
 * access to `formatMoney`. A discriminated union lets the UI compose the
 * sentence from the catalogue and format the figure exactly.
 */
/**
 * A React key and a dismiss handle, NOT an entity identifier.
 *
 * An alert is derived — "this service lost money", "these staff are burnt out"
 * — so it has no row of its own and no UUID. Typing it as one would be a lie
 * the schema enforces: the first composite key like `alert-morale-<id>` fails
 * to parse, and the fix would be to mint a fake UUID for a thing that is not a
 * record.
 */
const AlertIdSchema = z.string().min(1);

export const OpsAlertSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('negativeProfit'),
    id: AlertIdSchema,
    at: IsoDateTimeSchema,
    restaurantId: UuidSchema,
    restaurantName: z.string(),
    sessionId: UuidSchema,
    profit: MoneySchema,
  }),
  z.object({
    kind: z.literal('burntOutStaff'),
    id: AlertIdSchema,
    at: IsoDateTimeSchema,
    restaurantId: UuidSchema,
    restaurantName: z.string(),
    /** Morale in the balancing.json "Burnt Out" band, 0–19. */
    staffCount: z.int().min(1),
  }),
  z.object({
    kind: z.literal('failedInspection'),
    id: AlertIdSchema,
    at: IsoDateTimeSchema,
    restaurantId: UuidSchema,
    restaurantName: z.string(),
    sessionId: UuidSchema,
    result: z.string(),
  }),
]);

/**
 * `GET /admin/v1/ops/summary`.
 *
 * `asOf` is not decoration: §6.4 requires every aggregate to carry the instant
 * it was computed, because a polled figure on screen is always slightly old and
 * an operator comparing two panels needs to know they agree.
 */
export const OpsSummarySchema = z.object({
  asOf: IsoDateTimeSchema,
  today: z.object({
    sessions: z.int().min(0),
    covers: z.int().min(0),
    revenue: MoneySchema,
    /** `null` when nothing ran — never 0, which reads as "everyone hated it". */
    averageSatisfaction: ScoreSchema.nullable(),
    reviewsAwaitingModeration: z.int().min(0),
  }),
  recentSessions: z.array(ServiceSessionRowSchema),
  alerts: z.array(OpsAlertSchema),
});
