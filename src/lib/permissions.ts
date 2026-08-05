import { ROLES, type Role } from '@/domain/enums';

/**
 * The §8.2 role matrix, in one place.
 *
 * §7.4 makes this one table drive three things — which nav groups the rail
 * renders, which controls are disabled, and which routes a guard admits — so
 * that they cannot disagree. Three hand-written checks in three files is how a
 * console ends up hiding a button it will happily let you POST.
 *
 * ── These checks are UX, never security ─────────────────────────────────────
 * The server is the authority. Everything here runs in a bundle the operator
 * can edit, so it exists to keep an operator from being *shown* an action that
 * will 403 — not to stop them taking it. The matrix is duplicated server-side
 * by `requireRole` (§8.2), which reads the role from the database on every
 * request precisely because a JWT claim cannot be trusted for this.
 *
 * ── And it never hides a route ──────────────────────────────────────────────
 * A forbidden route still resolves and renders `ForbiddenState`. Hiding it
 * leaves someone who typed the URL on a blank page with no way to tell "you may
 * not" from "this is broken".
 */

/**
 * One capability per column of the §8.2 table — six, no more.
 *
 * Deliberately coarse. A finer grid ("may edit a dish but not delete one")
 * would be a permission model the backend has not agreed to and the audit log
 * cannot express; §8.2 is the contract, and this mirrors it exactly.
 */
export const CAPABILITIES = [
  /** Read Live Ops, and export what is readable — the analyst's whole remit. */
  'ops.read',
  /** GDPR export and erasure against a player account. */
  'gdpr.act',
  /** `Review.isFeatured` and `reviewText` redaction. Never a score. */
  'reviews.moderate',
  /** Create, edit, and delete catalogue content. */
  'catalog.write',
  /** Publish or roll back a balancing version. */
  'balancing.publish',
  /** Grant and revoke operator roles. */
  'admin.manage',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * §8.2, transcribed. A `Set` per role rather than a boolean grid: the question
 * asked at every call site is "does this role have X", and a set answers it
 * without a second lookup that can be typo'd into `undefined`, which is falsy
 * and therefore silently denies instead of failing loudly.
 */
const MATRIX: Readonly<Record<Role, ReadonlySet<Capability>>> = {
  owner: new Set(CAPABILITIES),
  admin: new Set<Capability>([
    'ops.read',
    'gdpr.act',
    'reviews.moderate',
    'catalog.write',
    'balancing.publish',
  ]),
  // Read and export, and nothing else. The one role that is safe to hand out
  // widely, which is exactly why it must not quietly accumulate write access.
  analyst: new Set<Capability>(['ops.read']),
  support: new Set<Capability>(['ops.read', 'gdpr.act', 'reviews.moderate']),
  // A game account. `POST /auth/register` always produces this role (§8.2), so
  // it is what an ordinary player's token carries — and it must open nothing.
  player: new Set<Capability>([]),
};

/** Does this role hold this capability? The single question the matrix answers. */
export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].has(capability);
}

/** Every capability a role holds, in `CAPABILITIES` order. For the admin screen. */
export function capabilitiesOf(role: Role): readonly Capability[] {
  return CAPABILITIES.filter((capability) => can(role, capability));
}

/**
 * May this role use the console at all?
 *
 * Not `role !== 'player'`: a role added later with no capabilities would slip
 * through that. Derived from the matrix, so the answer stays true by
 * construction.
 */
export function canSignIn(role: Role): boolean {
  return capabilitiesOf(role).length > 0;
}

/** Every role that can sign in, least → most privileged. For the mock roster and the admin screen. */
export const OPERATOR_ROLES: readonly Role[] = ROLES.filter(canSignIn);
