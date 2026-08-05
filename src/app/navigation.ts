import type { Capability } from '@/lib/permissions';
import type { StaticMessageKey } from '@/i18n/t';

/**
 * The §4 information architecture, as data.
 *
 * ── Why one table instead of four ───────────────────────────────────────────
 * The rail, the breadcrumb, the ⌘K palette, and the route guards all need to
 * know the same three things about a screen: what it is called, who may see it,
 * and where it sits. Written separately they disagree — a route added to the
 * rail but not the palette, a capability tightened in the guard but not in the
 * rail, and the console starts showing a group whose every entry 403s.
 *
 * The router owns URL MATCHING; this owns everything else about a route.
 *
 * ── Phase honesty ──────────────────────────────────────────────────────────
 * Most of these screens do not exist yet, and §9 says which phase builds each.
 * `phase` carries that, and a route with one renders `PhasePlaceholder` naming
 * it rather than an empty page — so walking the console tells you what is built
 * and what is coming, instead of leaving you to guess whether a blank screen is
 * unfinished or broken.
 */

/** The five rail groups from §4, in order. `design` sits outside them. */
export const NAV_GROUPS = ['insights', 'ops', 'catalog', 'balancing', 'system'] as const;

export type NavGroup = (typeof NAV_GROUPS)[number];

export const NAV_GROUP_LABELS: Readonly<Record<NavGroup, StaticMessageKey>> = {
  insights: 'nav.insights',
  ops: 'nav.ops',
  catalog: 'nav.catalog',
  balancing: 'nav.balancing',
  system: 'nav.system',
};

/**
 * Which §9 phase builds a screen. `null` means it is built now.
 *
 * `insights2` is separate from `insights1` because §1.3 splits Insights in
 * two: stage 1 is derivable from tables that exist today, stage 2 is gated on
 * `AiCallLog`, `AiBudgetLedger`, and `TelemetryEvent` — none of which the
 * backend has built. A panel that cannot be computed says so and links to the
 * phase; §6.4 is explicit that it must never render a zero instead.
 */
export const PHASES = {
  ops: 'state.phase.ops',
  catalog: 'state.phase.catalog',
  balancing: 'state.phase.balancing',
  insights1: 'state.phase.insights1',
  insights2: 'state.phase.insights2',
  backend: 'state.phase.backend',
} as const satisfies Readonly<Record<string, StaticMessageKey>>;

export type PhaseKey = keyof typeof PHASES;

export interface ConsoleRoute {
  /** The URL, exactly as the router matches it. Detail routes carry their param. */
  readonly path: string;
  /**
   * `StaticMessageKey`, not `MessageKey`: a label is rendered by the rail, the
   * breadcrumb, and the palette, none of which has a value to interpolate. The
   * narrower type makes "a nav label that needs a parameter" a compile error
   * rather than a runtime throw from `t()`.
   */
  readonly label: StaticMessageKey;
  readonly group: NavGroup;
  /** Shown in the rail. Detail and sub-screens are reachable, not listed. */
  readonly inRail: boolean;
  /** `null` where merely being an operator is enough. */
  readonly capability: Capability | null;
  /** `null` once the screen is real. */
  readonly phase: PhaseKey | null;
  /** Searched by the palette but not shown — "venues" finds "Restaurants". */
  readonly keywords?: string;
}

/**
 * Every route under the console shell, in rail order.
 *
 * `/signin` and `/design` are absent deliberately: neither lives inside the
 * shell, neither appears in the rail, and `/design` is dev-and-preview tooling
 * rather than a product screen (§4).
 */
export const CONSOLE_ROUTES: readonly ConsoleRoute[] = [
  /* ── Insights ─────────────────────────────────────────────────────────── */
  {
    path: '/insights',
    label: 'route.insights',
    group: 'insights',
    inRail: true,
    capability: 'ops.read',
    phase: 'insights1',
    keywords: 'overview executive home dashboard',
  },
  {
    path: '/insights/economy',
    label: 'route.insights.economy',
    group: 'insights',
    inRail: true,
    capability: 'ops.read',
    phase: 'insights1',
    keywords: 'cost margin profit food beverage labor',
  },
  {
    path: '/insights/progression',
    label: 'route.insights.progression',
    group: 'insights',
    inRail: true,
    capability: 'ops.read',
    phase: 'insights1',
    keywords: 'tier reputation funnel',
  },
  {
    path: '/insights/content',
    label: 'route.insights.content',
    group: 'insights',
    inRail: true,
    capability: 'ops.read',
    phase: 'insights1',
    keywords: 'dish drink performance popularity',
  },
  {
    path: '/insights/system',
    label: 'route.insights.system',
    group: 'insights',
    inRail: true,
    capability: 'ops.read',
    phase: 'insights1',
    keywords: 'uptime health errors rate limit',
  },
  {
    path: '/insights/moments',
    label: 'route.insights.moments',
    group: 'insights',
    inRail: true,
    capability: 'ops.read',
    phase: 'insights2',
    keywords: 'emotional moment trigger kpi',
  },
  {
    path: '/insights/ai-cost',
    label: 'route.insights.aiCost',
    group: 'insights',
    inRail: true,
    capability: 'ops.read',
    phase: 'insights2',
    keywords: 'openai spend budget guard rail',
  },

  /* ── Live Ops ─────────────────────────────────────────────────────────── */
  {
    path: '/ops',
    label: 'route.ops',
    group: 'ops',
    inRail: true,
    capability: 'ops.read',
    phase: 'ops',
    keywords: 'live today activity home',
  },
  {
    path: '/ops/players',
    label: 'route.ops.players',
    group: 'ops',
    inRail: true,
    capability: 'ops.read',
    phase: 'ops',
    keywords: 'account user gdpr email',
  },
  {
    path: '/ops/players/$playerId',
    label: 'route.ops.player',
    group: 'ops',
    inRail: false,
    capability: 'ops.read',
    phase: 'ops',
  },
  {
    path: '/ops/restaurants',
    label: 'route.ops.restaurants',
    group: 'ops',
    inRail: true,
    capability: 'ops.read',
    phase: 'ops',
    keywords: 'venue smokehouse concept reputation',
  },
  {
    path: '/ops/restaurants/$restaurantId',
    label: 'route.ops.restaurant',
    group: 'ops',
    inRail: false,
    capability: 'ops.read',
    phase: 'ops',
  },
  {
    path: '/ops/sessions',
    label: 'route.ops.sessions',
    group: 'ops',
    inRail: true,
    capability: 'ops.read',
    phase: 'ops',
    keywords: 'service covers revenue profit',
  },
  {
    path: '/ops/sessions/$sessionId',
    label: 'route.ops.session',
    group: 'ops',
    inRail: false,
    capability: 'ops.read',
    phase: 'ops',
  },
  {
    path: '/ops/reviews',
    label: 'route.ops.reviews',
    group: 'ops',
    inRail: true,
    capability: 'reviews.moderate',
    phase: 'ops',
    keywords: 'moderation queue featured redact',
  },

  /* ── Catalog ──────────────────────────────────────────────────────────── */
  {
    path: '/catalog',
    label: 'route.catalog',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'content authoring home',
  },
  {
    path: '/catalog/concepts',
    label: 'route.catalog.concepts',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'bbq pub diner cuisine vibe',
  },
  {
    path: '/catalog/concepts/$conceptId',
    label: 'route.catalog.concept',
    group: 'catalog',
    inRail: false,
    capability: 'catalog.write',
    phase: 'catalog',
  },
  {
    path: '/catalog/dishes',
    label: 'route.catalog.dishes',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'menu food flavour profile dqs',
  },
  {
    path: '/catalog/dishes/$dishId',
    label: 'route.catalog.dish',
    group: 'catalog',
    inRail: false,
    capability: 'catalog.write',
    phase: 'catalog',
  },
  {
    path: '/catalog/drinks',
    label: 'route.catalog.drinks',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'cocktail bar spirit cqs signature',
  },
  {
    path: '/catalog/drinks/$drinkId',
    label: 'route.catalog.drink',
    group: 'catalog',
    inRail: false,
    capability: 'catalog.write',
    phase: 'catalog',
  },
  {
    path: '/catalog/staff',
    label: 'route.catalog.staff',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'chef bartender server manager wage morale',
  },
  {
    path: '/catalog/ambience',
    label: 'route.catalog.ambience',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'lighting music decor seating uniform',
  },
  {
    path: '/catalog/flavor-anchors',
    label: 'route.catalog.flavorAnchors',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'ingredient element anchor table grid',
  },
  {
    path: '/catalog/starter-kits',
    label: 'route.catalog.starterKits',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'preset bundle opening',
  },
  {
    path: '/catalog/export',
    label: 'route.catalog.export',
    group: 'catalog',
    inRail: true,
    capability: 'catalog.write',
    phase: 'catalog',
    keywords: 'unity json scriptableobject handoff diff',
  },

  /* ── Balancing ────────────────────────────────────────────────────────── */
  {
    path: '/balancing',
    label: 'route.balancing',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'studio hash drift active version',
  },
  {
    path: '/balancing/tiers',
    label: 'route.balancing.tiers',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'new known popular beloved caps unlocks',
  },
  {
    path: '/balancing/reputation',
    label: 'route.balancing.reputation',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'gain loss factor modifier asymmetry',
  },
  {
    path: '/balancing/morale',
    label: 'route.balancing.morale',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'drops rises tier multiplier burnt out',
  },
  {
    path: '/balancing/events',
    label: 'route.balancing.events',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'birthday critic vip inspection rush',
  },
  {
    path: '/balancing/economy',
    label: 'route.balancing.economy',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'targets food cost labor margin',
  },
  {
    path: '/balancing/tune',
    label: 'route.balancing.tune',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'unauthored null backlog decision queue',
  },
  {
    path: '/balancing/simulate',
    label: 'route.balancing.simulate',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'golden value diff dqs cqs preview breaking',
  },
  {
    path: '/balancing/versions',
    label: 'route.balancing.versions',
    group: 'balancing',
    inRail: true,
    capability: 'balancing.publish',
    phase: 'balancing',
    keywords: 'history compare rollback timeline',
  },

  /* ── System ───────────────────────────────────────────────────────────── */
  {
    path: '/system/audit',
    label: 'route.system.audit',
    group: 'system',
    inRail: true,
    capability: 'ops.read',
    phase: 'backend',
    keywords: 'trail actor action before after',
  },
  {
    path: '/system/admins',
    label: 'route.system.admins',
    group: 'system',
    inRail: true,
    capability: 'admin.manage',
    phase: 'backend',
    keywords: 'operator role grant revoke owner',
  },
  {
    path: '/system/settings',
    label: 'route.system.settings',
    group: 'system',
    inRail: true,
    capability: 'ops.read',
    phase: 'backend',
    keywords: 'environment configuration preferences',
  },
];

const BY_PATH = new Map(CONSOLE_ROUTES.map((route) => [route.path, route]));

/**
 * Looks a route up by the router's matched `routeId`-style path.
 *
 * Exact only — no prefix fallback. A guard that silently fell back to a parent
 * would give a route nobody registered the parent's capability, which is the
 * quiet way an unlisted screen ends up readable by the wrong role.
 */
export function routeFor(path: string): ConsoleRoute | undefined {
  return BY_PATH.get(path);
}

/** The rail entries for one group, in declaration order. */
export function railRoutes(group: NavGroup): readonly ConsoleRoute[] {
  return CONSOLE_ROUTES.filter((route) => route.group === group && route.inRail);
}
