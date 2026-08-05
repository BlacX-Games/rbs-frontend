/**
 * Wire value → display label, for every enum that crosses the API boundary.
 *
 * ── The drift this file resolves (§1.3) ─────────────────────────────────────
 * Unity spells two archetypes `Budget` and `Family`; Prisma spells them
 * `BudgetGuest` and `FamilyDiner`. Unity spells a price bracket `BudgetMid`;
 * Prisma spells it `budget_mid`. **Prisma is canonical** — it is the persisted
 * form and the wire format — so the values below are copied verbatim from
 * `rbs-backend/prisma/schema.prisma`, and the Unity rename is raised to the
 * game track as a decision rather than silently patched here.
 *
 * ── Why every label map is a closed `Record` ────────────────────────────────
 * `Readonly<Record<Enum, string>>` makes the compiler the exhaustiveness check
 * §10 asks for: add a member to Prisma, widen the array here, and every label
 * map missing an entry fails `tsc` before it can reach a screen as a blank
 * cell. An index signature or a `Partial` would let that ship.
 *
 * Labels are English and live here rather than in the i18n catalogue because
 * they are a *mapping of a wire value*, not page copy: a screen that renders an
 * archetype needs the same word wherever it appears, and a translator changing
 * one instance of "Budget guest" must change all of them. When a second locale
 * lands these become catalogue keys; the map shape does not change.
 */

/* ── Archetype ───────────────────────────────────────────────────────────── */

/** `schema.prisma:36-49`. Ten, and the §5.2 ceiling on series slots is eight —
 *  so any chart faceted by archetype uses `SmallMultiples`, never eight hues
 *  plus two invented ones. */
export const ARCHETYPES = [
  'Foodie',
  'Tourist',
  'Regular',
  'BudgetGuest',
  'CocktailEnthusiast',
  'SportsFan',
  'FamilyDiner',
  'Influencer',
  'Critic',
  'PickyEater',
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABELS: Readonly<Record<Archetype, string>> = {
  Foodie: 'Foodie',
  Tourist: 'Tourist',
  Regular: 'Regular',
  BudgetGuest: 'Budget guest',
  CocktailEnthusiast: 'Cocktail enthusiast',
  SportsFan: 'Sports fan',
  FamilyDiner: 'Family diner',
  Influencer: 'Influencer',
  Critic: 'Critic',
  PickyEater: 'Picky eater',
};

/* ── PriceBracket ────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:55-64`. Six values, and the schema itself carries a
 * `[NEEDS DECISION]` note: §8.1's catalogue uses these six while 03 §3.0 lists
 * only four. Six is what the seed data needs, so six is what ships — screens
 * showing a bracket pair it with a `DecisionFlag` (golden rule 5).
 */
export const PRICE_BRACKETS = [
  'budget',
  'budget_mid',
  'mid',
  'mid_upscale',
  'upscale',
  'fine',
] as const;

export type PriceBracket = (typeof PRICE_BRACKETS)[number];

export const PRICE_BRACKET_LABELS: Readonly<Record<PriceBracket, string>> = {
  budget: 'Budget',
  budget_mid: 'Budget–mid',
  mid: 'Mid',
  mid_upscale: 'Mid–upscale',
  upscale: 'Upscale',
  fine: 'Fine dining',
};

/* ── AgeBracket ──────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:81-87`. A BRACKET, never a date of birth: enough to apply
 * COPPA's under-13 line and the GDPR digital-consent range, nothing more. The
 * dashboard must not widen that — there is no birthday to display because the
 * backend deliberately never stored one.
 */
export const AGE_BRACKETS = ['under13', 'age13_15', 'age16plus'] as const;

export type AgeBracket = (typeof AGE_BRACKETS)[number];

export const AGE_BRACKET_LABELS: Readonly<Record<AgeBracket, string>> = {
  under13: 'Under 13',
  age13_15: '13–15',
  age16plus: '16+',
};

/* ── AuthProvider ────────────────────────────────────────────────────────── */

/** `schema.prisma:69-76`. `device` is anonymous play and carries no PII. */
export const AUTH_PROVIDERS = ['device', 'password', 'google', 'apple'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const AUTH_PROVIDER_LABELS: Readonly<Record<AuthProvider, string>> = {
  device: 'Device',
  password: 'Email',
  google: 'Google',
  apple: 'Apple',
};

/* ── AiTier ──────────────────────────────────────────────────────────────── */

/**
 * `schema.prisma:92-97`. Read-only in this console for now: it gates AI model
 * choice and budget server-side, and no §8.4 route exposes a write for it.
 */
export const AI_TIERS = ['free', 'premium'] as const;

export type AiTier = (typeof AI_TIERS)[number];

export const AI_TIER_LABELS: Readonly<Record<AiTier, string>> = {
  free: 'Free',
  premium: 'Premium',
};

/* ── Role ────────────────────────────────────────────────────────────────── */

/**
 * AUTHORED, not sourced (§12). `rbs-backend` has no `Role`, no RBAC, and no
 * phase that promises either — a full-text search of its `src/`, `docs/`,
 * `prisma/`, `CLAUDE.md`, and git history returns zero occurrences of "admin".
 * §8.1 requests this enum on `Player`; until that migration exists it is served
 * by the mock network and nothing else.
 *
 * Order is least → most privileged, and `lib/permissions.ts` depends on the
 * membership rather than the order — do not encode seniority as an index.
 */
export const ROLES = ['player', 'support', 'analyst', 'admin', 'owner'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  player: 'Player',
  support: 'Support',
  analyst: 'Analyst',
  admin: 'Admin',
  owner: 'Owner',
};

/**
 * What each role is for, shown beside the label wherever a role is *chosen*
 * rather than merely displayed — the admin list and the change-role dialog.
 * Picking the wrong role is a privilege mistake, and a bare five-word select is
 * how that happens.
 */
export const ROLE_DESCRIPTIONS: Readonly<Record<Role, string>> = {
  player: 'A game account. No console access.',
  support: 'Live Ops, GDPR actions, and review moderation.',
  analyst: 'Read and export only. No writes anywhere.',
  admin: 'Everything except managing other operators.',
  owner: 'Full access, including operator management.',
};
