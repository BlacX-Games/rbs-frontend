import { describe, expect, it } from 'vitest';
import { ROLES, type Role } from '@/domain/enums';
import {
  CAPABILITIES,
  OPERATOR_ROLES,
  can,
  canSignIn,
  capabilitiesOf,
  type Capability,
} from '@/lib/permissions';

/**
 * §8.2, transcribed as a table and asserted cell by cell.
 *
 * Written out in full rather than derived, because the matrix under test is
 * also a table — and a test that builds its expectation the same way the source
 * does agrees with the source's bugs.
 */
const EXPECTED: Readonly<Record<Role, readonly Capability[]>> = {
  owner: [
    'ops.read',
    'gdpr.act',
    'reviews.moderate',
    'catalog.write',
    'balancing.publish',
    'admin.manage',
  ],
  admin: ['ops.read', 'gdpr.act', 'reviews.moderate', 'catalog.write', 'balancing.publish'],
  analyst: ['ops.read'],
  support: ['ops.read', 'gdpr.act', 'reviews.moderate'],
  player: [],
};

describe('the role matrix', () => {
  for (const role of ROLES) {
    it(`grants ${role} exactly its §8.2 row`, () => {
      expect(capabilitiesOf(role)).toEqual(EXPECTED[role]);
    });
  }

  it('answers every role × capability pair without undefined', () => {
    // A missing row would make `can()` throw on `.has` of undefined; a missing
    // column would make it silently return false, which denies rather than
    // grants — safe, but invisible. Both are worth failing on.
    for (const role of ROLES) {
      for (const capability of CAPABILITIES) {
        expect(typeof can(role, capability)).toBe('boolean');
      }
    }
  });

  it('gives a player nothing at all', () => {
    // `POST /auth/register` always produces role `player` (§8.2), so this is
    // what an ordinary game token carries. It must open nothing.
    for (const capability of CAPABILITIES) {
      expect(can('player', capability), capability).toBe(false);
    }
    expect(canSignIn('player')).toBe(false);
  });

  it('reserves operator management for the owner alone', () => {
    const holders = ROLES.filter((role) => can(role, 'admin.manage'));
    expect(holders).toEqual(['owner']);
  });

  it('keeps the analyst read-only', () => {
    // The role safe to hand out widely, and therefore the one that must not
    // quietly accumulate a write.
    const writes: readonly Capability[] = [
      'gdpr.act',
      'reviews.moderate',
      'catalog.write',
      'balancing.publish',
      'admin.manage',
    ];

    for (const capability of writes) {
      expect(can('analyst', capability), capability).toBe(false);
    }
  });

  it('derives the operator roster from the matrix, not from a name check', () => {
    // `role !== 'player'` would let a future capability-less role sign in.
    expect(OPERATOR_ROLES).toEqual(['support', 'analyst', 'admin', 'owner']);
  });
});
