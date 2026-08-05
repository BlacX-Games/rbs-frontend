import { z } from 'zod';
import { ROLES } from '@/domain/enums';
import { IsoDateTimeSchema, UuidSchema } from '@/domain/schemas/primitives';

/**
 * The admin surface itself: who is signed in, and what they did.
 *
 * Everything in this file is AUTHORED (§12). `rbs-backend` has no admin
 * identity, no `Role`, no audit log, and no phase that promises any of them —
 * so these shapes are a work-order the backend will be handed, served today by
 * the mock network. They are modelled on the auth surface that *does* exist so
 * the eventual implementation is a reuse rather than a rewrite.
 */

/* ── Session ─────────────────────────────────────────────────────────────── */

export const SignInRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * §8.3 splits the two credentials on purpose, and the split is the security
 * property:
 *
 *   • The ACCESS token comes back in the body and lives in a module-scoped
 *     variable — never `localStorage`, which any injected script can read.
 *   • The REFRESH token never appears here at all. It is set as an httpOnly,
 *     `SameSite=Strict`, `Secure` cookie, so this bundle cannot read it and an
 *     XSS cannot exfiltrate a 60-day credential.
 *
 * That is a deliberate divergence from the game client, which keeps the
 * existing body-returned bearer flow: Unity is not a browser and has no cookie
 * jar or XSS surface to protect against.
 *
 * `expiresIn` is seconds. §8.2 sets an admin access TTL of 300 against the game
 * client's 900, because `requireRole` verifies against the database on every
 * request and a shorter window bounds what a revoked operator can still do.
 */
export const SessionResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.int().positive(),
  operator: z.object({
    id: UuidSchema,
    email: z.email(),
    username: z.string().nullable(),
    role: z.enum(ROLES),
  }),
});

/**
 * `POST /admin/v1/auth/refresh` — a new access token from the cookie alone.
 *
 * No operator: a refresh renews a credential, it does not change who is signed
 * in. Returning one anyway would make every component reading the session
 * re-render on a silent background call for a change none of them can see.
 */
export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.int().positive(),
});

/** `GET /admin/v1/me` — the operator behind the current token. */
export const OperatorSchema = SessionResponseSchema.shape.operator;

/* ── Audit ───────────────────────────────────────────────────────────────── */

/**
 * §8.1's `AdminAuditLog`. Golden rule 7: no mutation route exists without a row
 * here, which makes this table the reason a write is allowed at all.
 *
 * `before` / `after` are `unknown` because they hold whatever entity was
 * touched. They are rendered through `JsonDiff`, which does not need a type —
 * and giving them one would mean a union over every auditable entity that has
 * to be widened before the backend can log a new one.
 *
 * `ip` and `userAgent` describe the ACTOR, who is an employee, not a player —
 * golden rule 6's PII ban is about player data, and an audit trail that cannot
 * say where an action came from does not do its job. Retention is indefinite
 * and PII-free by the `AccountDeletion` precedent: prove the action, do not
 * retain the person.
 */
export const AuditEntrySchema = z.object({
  id: UuidSchema,
  actorId: UuidSchema,
  actorEmail: z.email().nullable(),
  actorRole: z.enum(ROLES),
  /** Dotted and stable — `balancing.publish`, `player.delete`, `review.moderate`. */
  action: z.string(),
  entityType: z.string(),
  entityId: UuidSchema.nullable(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});
