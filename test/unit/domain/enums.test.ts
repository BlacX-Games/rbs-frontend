import { describe, expect, it } from 'vitest';
import {
  AGE_BRACKETS,
  AGE_BRACKET_LABELS,
  ARCHETYPES,
  ARCHETYPE_LABELS,
  AI_TIERS,
  AI_TIER_LABELS,
  AUTH_PROVIDERS,
  AUTH_PROVIDER_LABELS,
  PRICE_BRACKETS,
  PRICE_BRACKET_LABELS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from '@/domain/enums';

/**
 * The wire values, pinned against `rbs-backend/prisma/schema.prisma`.
 *
 * §10 asks for "a compile-time exhaustiveness check [that] catches a new Prisma
 * enum member that the dashboard has not labelled" — the `Record<Enum, string>`
 * types do that. What they cannot catch is a member that was TRANSCRIBED WRONG:
 * `BudgetGuest` typed as Unity's `Budget` still type-checks perfectly, and then
 * silently matches nothing on the wire. So the expectations below are literals,
 * copied from the schema, not derived from the source.
 */

const SCHEMA = {
  // schema.prisma:36-49
  archetype: [
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
  ],
  // schema.prisma:55-64
  priceBracket: ['budget', 'budget_mid', 'mid', 'mid_upscale', 'upscale', 'fine'],
  // schema.prisma:69-76
  authProvider: ['device', 'password', 'google', 'apple'],
  // schema.prisma:81-87
  ageBracket: ['under13', 'age13_15', 'age16plus'],
  // schema.prisma:92-97
  aiTier: ['free', 'premium'],
};

describe('wire values', () => {
  it('matches the Prisma Archetype enum, including the names Unity spells differently', () => {
    // Unity has `Budget` and `Family`; Prisma has `BudgetGuest` and
    // `FamilyDiner`. §1.3 settles it: Prisma is canonical, because it is the
    // persisted form and the wire format.
    expect(ARCHETYPES).toEqual(SCHEMA.archetype);
    expect(ARCHETYPES).toContain('BudgetGuest');
    expect(ARCHETYPES).toContain('FamilyDiner');
  });

  it('matches the Prisma PriceBracket enum in snake_case', () => {
    // Unity spells this `BudgetMid`.
    expect(PRICE_BRACKETS).toEqual(SCHEMA.priceBracket);
  });

  it('matches the remaining Prisma enums', () => {
    expect(AUTH_PROVIDERS).toEqual(SCHEMA.authProvider);
    expect(AGE_BRACKETS).toEqual(SCHEMA.ageBracket);
    expect(AI_TIERS).toEqual(SCHEMA.aiTier);
  });

  it('carries ten archetypes, which is over the eight-slot series ceiling', () => {
    // §5.2 caps categorical series at eight, because a ninth generated hue is
    // indistinguishable under CVD. Any chart faceted by archetype therefore
    // uses SmallMultiples — this assertion is the reminder of why.
    expect(ARCHETYPES).toHaveLength(10);
  });
});

describe('display labels', () => {
  const MAPS = [
    ['Archetype', ARCHETYPES, ARCHETYPE_LABELS],
    ['PriceBracket', PRICE_BRACKETS, PRICE_BRACKET_LABELS],
    ['AuthProvider', AUTH_PROVIDERS, AUTH_PROVIDER_LABELS],
    ['AgeBracket', AGE_BRACKETS, AGE_BRACKET_LABELS],
    ['AiTier', AI_TIERS, AI_TIER_LABELS],
    ['Role', ROLES, ROLE_LABELS],
  ] as const;

  for (const [name, values, labels] of MAPS) {
    it(`labels every ${name} member, non-empty`, () => {
      // The Record type makes a MISSING label a compile error. This catches the
      // other half: a label that exists and is blank, which renders as an empty
      // table cell rather than as a build failure.
      const map: Readonly<Record<string, string>> = labels;

      for (const value of values) {
        expect(map[value], `${name}.${value}`).toBeTruthy();
      }

      expect(Object.keys(map)).toHaveLength(values.length);
    });
  }

  it('describes every role, because picking the wrong one is a privilege mistake', () => {
    for (const role of ROLES) {
      expect(ROLE_DESCRIPTIONS[role].length, role).toBeGreaterThan(0);
    }
  });
});

describe('Role', () => {
  it('is the authored five, least to most privileged', () => {
    // AUTHORED (§12): rbs-backend has no Role, no RBAC, and no phase promising
    // either. This is a work-order, served today by the mock network.
    expect(ROLES).toEqual(['player', 'support', 'analyst', 'admin', 'owner']);
  });
});
