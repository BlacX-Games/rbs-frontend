import { describe, expect, it } from 'vitest';
import {
  CONSOLE_ROUTES,
  NAV_GROUPS,
  NAV_GROUP_LABELS,
  PHASES,
  railRoutes,
  routeFor,
} from '@/app/navigation';
import { ENVIRONMENTS, ENVIRONMENT_LABELS, resolveEnvironment } from '@/app/environment';
import { CAPABILITIES } from '@/lib/permissions';
import { en } from '@/i18n/en';

/**
 * The route table, which four things read: the rail, the breadcrumb, the ⌘K
 * palette, and the capability guard.
 *
 * Because it is one table, most of what could go wrong is a compile error. What
 * is left is the class of mistake types cannot see — a duplicate path, a route
 * that is unreachable from anywhere, a phase key with no copy behind it.
 */

describe('the route table', () => {
  it('has no duplicate paths', () => {
    // `routeFor` is a Map, so a duplicate would not throw — it would silently
    // win, and one of the two screens would take the other's capability.
    const paths = CONSOLE_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('covers every §4 group, and every group has a rail entry', () => {
    for (const group of NAV_GROUPS) {
      expect(railRoutes(group).length, group).toBeGreaterThan(0);
      expect(en[NAV_GROUP_LABELS[group]], group).toBeTruthy();
    }
  });

  it('gives every route a real capability', () => {
    // A route with a capability outside the matrix would be permanently
    // forbidden — `can()` returns false for an unknown one — and would look
    // like a permissions bug rather than a typo.
    for (const route of CONSOLE_ROUTES) {
      if (route.capability === null) continue;
      expect(CAPABILITIES, route.path).toContain(route.capability);
    }
  });

  it('backs every phase key with copy', () => {
    for (const route of CONSOLE_ROUTES) {
      if (route.phase === null) continue;
      expect(en[PHASES[route.phase]], route.path).toBeTruthy();
    }
  });

  it('keeps every detail route out of the rail', () => {
    // A rail entry whose path carries a `$param` would render a literal
    // "$playerId" in the URL and 404 on click.
    for (const route of CONSOLE_ROUTES) {
      if (!route.path.includes('$')) continue;
      expect(route.inRail, route.path).toBe(false);
    }
  });

  it('resolves a path exactly, and refuses a near miss', () => {
    expect(routeFor('/ops/players')?.label).toBe('route.ops.players');

    // No prefix fallback: a route resolving to its parent would inherit a
    // capability nobody granted it.
    expect(routeFor('/ops/players/')).toBeUndefined();
    expect(routeFor('/ops/players/extra')).toBeUndefined();
  });

  it('reaches the whole Live Ops module from the rail', () => {
    const ops = railRoutes('ops').map((route) => route.path);

    expect(ops).toEqual([
      '/ops',
      '/ops/players',
      '/ops/restaurants',
      '/ops/sessions',
      '/ops/reviews',
    ]);
  });
});

describe('the environment badge', () => {
  it('reads localhost and the .local suffix as local', () => {
    expect(resolveEnvironment('', 'localhost')).toBe('local');
    expect(resolveEnvironment('', '127.0.0.1')).toBe('local');
    expect(resolveEnvironment('http://localhost:3000', 'anything')).toBe('local');
    expect(resolveEnvironment('', 'console.rbs.local')).toBe('local');
  });

  it('recognises the usual pre-production names', () => {
    expect(resolveEnvironment('https://api-staging.rbs.example', 'x')).toBe('staging');
    expect(resolveEnvironment('https://preview-7.rbs.example', 'x')).toBe('staging');
  });

  it('defaults an unrecognised host to PRODUCTION', () => {
    // The cautious direction, and the whole reason the badge exists: an
    // operator who sees "Production" on staging loses a second; one who sees
    // "Staging" on production can publish a balancing version to the live game.
    expect(resolveEnvironment('https://api.rbs.example', 'x')).toBe('production');
    expect(resolveEnvironment('', 'console.rbs.example')).toBe('production');
    expect(resolveEnvironment('', '')).toBe('production');
  });

  it('labels every environment', () => {
    for (const environment of ENVIRONMENTS) {
      expect(en[ENVIRONMENT_LABELS[environment]], environment).toBeTruthy();
    }
  });
});
