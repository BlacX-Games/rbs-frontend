import type { z } from 'zod';
import type {
  AmbienceSchema,
  ConceptRowSchema,
  ConceptSchema,
  DishSchema,
  DrinkSchema,
  StaffSchema,
} from '@/domain/schemas/catalog';
import type {
  AuditEntrySchema,
  OperatorSchema,
  SessionResponseSchema,
  SignInRequestSchema,
} from '@/domain/schemas/admin';
import type {
  AuthIdentitySummarySchema,
  GuestSchema,
  OpsAlertSchema,
  OpsSummarySchema,
  PlayerDetailSchema,
  PlayerRowSchema,
  PlayerSchema,
  RestaurantDetailSchema,
  RestaurantRowSchema,
  RestaurantSchema,
  RestaurantSummarySchema,
  ReviewPatchSchema,
  ReviewRowSchema,
  ReviewSchema,
  ServiceSessionRowSchema,
  ServiceSessionSchema,
  SessionDetailSchema,
} from '@/domain/schemas/ops';
import type { ValidationIssueSchema } from '@/domain/schemas/primitives';

/**
 * Every wire type, inferred from the schema that validates it.
 *
 * One import for screens, which never touch Zod: a route wants `PlayerRow`, not
 * `z.infer<typeof PlayerRowSchema>` written out at fifteen call sites.
 *
 * INFERRED, never hand-written. Declaring these as interfaces beside the
 * schemas would be two definitions of one contract, and the first field rename
 * would leave a type that compiles against data the parser rejects — with
 * nothing to catch it, because the type is what the test would assert. This
 * mirrors `rbs-backend`, which re-exports Prisma's generated model types for
 * exactly the same reason rather than declaring parallel interfaces.
 *
 * `Page<T>` lives in `schemas/primitives.ts` because it is generic over an
 * item and cannot be inferred from a concrete schema.
 */

export type { Page } from '@/domain/schemas/primitives';
export type {
  Archetype,
  AgeBracket,
  AiTier,
  AuthProvider,
  PriceBracket,
  Role,
} from '@/domain/enums';
export type { FlavorDimension, FlavorProfile } from '@/domain/flavor';

/* ── Admin ───────────────────────────────────────────────────────────────── */

export type SignInRequest = z.infer<typeof SignInRequestSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type Operator = z.infer<typeof OperatorSchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/* ── Ops ─────────────────────────────────────────────────────────────────── */

export type Player = z.infer<typeof PlayerSchema>;
export type PlayerRow = z.infer<typeof PlayerRowSchema>;
export type AuthIdentitySummary = z.infer<typeof AuthIdentitySummarySchema>;
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type RestaurantRow = z.infer<typeof RestaurantRowSchema>;
export type RestaurantSummary = z.infer<typeof RestaurantSummarySchema>;
export type Guest = z.infer<typeof GuestSchema>;
export type ServiceSession = z.infer<typeof ServiceSessionSchema>;
export type ServiceSessionRow = z.infer<typeof ServiceSessionRowSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type ReviewRow = z.infer<typeof ReviewRowSchema>;
export type ReviewPatch = z.infer<typeof ReviewPatchSchema>;

/* ── Screen responses ────────────────────────────────────────────────────── */

export type PlayerDetail = z.infer<typeof PlayerDetailSchema>;
export type RestaurantDetail = z.infer<typeof RestaurantDetailSchema>;
export type SessionDetail = z.infer<typeof SessionDetailSchema>;
export type OpsSummary = z.infer<typeof OpsSummarySchema>;
export type OpsAlert = z.infer<typeof OpsAlertSchema>;

/* ── Catalog ─────────────────────────────────────────────────────────────── */

export type Concept = z.infer<typeof ConceptSchema>;
export type ConceptRow = z.infer<typeof ConceptRowSchema>;
export type Dish = z.infer<typeof DishSchema>;
export type Drink = z.infer<typeof DrinkSchema>;
export type Staff = z.infer<typeof StaffSchema>;
export type Ambience = z.infer<typeof AmbienceSchema>;

/* ── Errors ──────────────────────────────────────────────────────────────── */

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
