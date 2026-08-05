import { z } from 'zod';
import { ARCHETYPES, PRICE_BRACKETS } from '@/domain/enums';
import { FLAVOR_DIMENSIONS } from '@/domain/flavor';
import {
  IsoDateTimeSchema,
  MoneySchema,
  PercentageSchema,
  RatingSchema,
  ScoreSchema,
  UuidSchema,
} from '@/domain/schemas/primitives';

/**
 * The authored content graph: Concept, Dish, Drink, Staff, Ambience.
 *
 * Field-for-field against `rbs-backend/prisma/schema.prisma`, with two
 * substitutions that hold everywhere in `domain/schemas/`:
 *
 *   Prisma `Decimal`  → a decimal STRING (see `primitives.ts`)
 *   Prisma `DateTime` → an ISO-8601 string
 *
 * Optionality is transcribed exactly: a Prisma `String?` is `.nullable()` here,
 * not `.optional()`. They are different on the wire — the backend sends
 * `"description": null`, not an absent key — and conflating them is how a
 * `!== undefined` check starts passing for a field that is genuinely unset.
 */

/* ── Concept ─────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:171-184`. The 10-concept catalogue is reference data every
 * scoring system grades against, and `prisma/seed.ts` upserts it by `name` —
 * which is `@unique`, and therefore the thing a delete has to check before
 * running. `Concept` has NO cascade, so an FK would restrict the delete; §6.2
 * blocks it in the UI up front rather than surfacing a 409.
 */
export const ConceptSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  cuisineTags: z.array(z.string()),
  vibeTags: z.array(z.string()),
  priceBracket: z.enum(PRICE_BRACKETS),
  targetArchetypes: z.array(z.enum(ARCHETYPES)),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

/** How many restaurants reference it — what makes a delete safe or refused. */
export const ConceptRowSchema = ConceptSchema.extend({
  restaurantCount: z.int().min(0),
});

/* ── Flavor profile ──────────────────────────────────────────────────────── */

/**
 * The `Dish.flavorProfile` JSONB, closed to exactly the ten canonical keys.
 *
 * `z.strictObject` mirrors the backend's `FlavorProfileSchema`, which is also
 * strict — an eleventh dimension is a contract change, and accepting one here
 * would let it reach the radar as an axis nobody authored. Built from
 * `FLAVOR_DIMENSIONS` so the schema cannot drift from the array the editor and
 * the positional Unity export both read.
 */
export const FlavorProfileSchema = z.strictObject(
  Object.fromEntries(FLAVOR_DIMENSIONS.map((dimension) => [dimension, ScoreSchema])) as Record<
    (typeof FLAVOR_DIMENSIONS)[number],
    typeof ScoreSchema
  >,
);

/* ── Dish ────────────────────────────────────────────────────────────────── */

/** `schema.prisma:221-244`. */
export const DishSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  ingredients: z.array(z.string()),
  cookingMethod: z.string().nullable(),
  flavorProfile: FlavorProfileSchema,
  price: MoneySchema,
  foodCost: MoneySchema,
  /** A FIGURE, not a ratio — `30` means 30%. Nullable until a service prices it. */
  foodCostPercentage: PercentageSchema.nullable(),
  timesOrdered: z.int().min(0),
  averageRating: RatingSchema.nullable(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

/* ── Drink ───────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:246-267`. `flavorElements` is capped at four by the Drink
 * Builder (§6.2) — a UI constraint, not a database one, so it is enforced where
 * a drink is authored rather than asserted on read. Rejecting a fifth element
 * here would make an existing row unreadable in the console that has to fix it.
 */
export const DrinkSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  name: z.string(),
  baseSpirit: z.string().nullable(),
  flavorElements: z.array(z.string()),
  garnish: z.string().nullable(),
  glassware: z.string().nullable(),
  price: MoneySchema,
  beverageCost: MoneySchema,
  timesOrdered: z.int().min(0),
  averageRating: RatingSchema.nullable(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

/* ── Staff ───────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:269-291`.
 *
 * `role` is a bare `String`, deliberately: the GDD says "4 roles" and never
 * enumerates them, while Unity has `StaffRole { Chef, Bartender, Server,
 * Manager }`. §6.2 renders it as free text beside a `DecisionFlag` — narrowing
 * it to an enum here would present an unsettled decision as settled, which
 * golden rule 5 forbids.
 *
 * `weeklyCost` is an `Int` — whole dollars per week — and NOT money-as-decimal.
 * It is also the sole wage authority (golden rule 4): no screen derives an
 * hourly or daily figure from it and stores it back.
 */
export const StaffSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  name: z.string(),
  role: z.string(),
  speed: ScoreSchema,
  skill: ScoreSchema,
  friendliness: ScoreSchema,
  reliability: ScoreSchema,
  weeklyCost: z.int().min(0),
  morale: ScoreSchema,
  tenureDays: z.int().min(0),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

/* ── Ambience ────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:296-316`. Every content field is nullable with no default —
 * the schema itself carries a `[NEEDS DECISION]` note about it, and §6.2 flags
 * `guestEnergy` specifically (open question #9: input or output?).
 *
 * `ambienceScore` is an OUTPUT of the sim. Golden rule 2 puts it, like every
 * score, permanently out of reach of an admin write.
 */
export const AmbienceSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  lighting: z.string().nullable(),
  musicGenre: z.string().nullable(),
  musicVolume: ScoreSchema.nullable(),
  decorStyle: z.string().nullable(),
  seatingStyle: z.string().nullable(),
  noiseLevel: ScoreSchema.nullable(),
  themeNight: z.string().nullable(),
  wallArt: z.string().nullable(),
  uniforms: z.string().nullable(),
  guestEnergy: ScoreSchema.nullable(),
  ambienceScore: ScoreSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
