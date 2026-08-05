import { describe, expect, it } from 'vitest';
import { adminApi } from '@/api/endpoints';
import { MOCK_OPERATORS, MOCK_PASSWORD, universe } from '@/mocks/fixtures';
import { toMinorUnits } from '@/lib/money';
import { OPERATOR_ROLES } from '@/lib/permissions';
import { withMockNetwork } from '../../support/network';

/**
 * Every `AdminApi` method, driven end to end through the real parse.
 *
 * `api/client.ts` throws a `contract` failure when a 2xx body does not match
 * its schema — so simply CALLING each method is the assertion. That is the
 * whole design working: the mock is the specification, and a handler that
 * drifts from the schema it is supposed to implement fails here rather than
 * three components deep as `undefined is not an object`.
 */

withMockNetwork();

const found = MOCK_OPERATORS.find((operator) => operator.role === 'owner');
if (found === undefined) throw new Error('The mock roster must carry an owner');

// Rebound after the guard: a function declaration is hoisted, so TypeScript
// will not carry the outer narrowing into one that closes over `found`.
const owner = found;

async function signIn(): Promise<void> {
  await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);
}

describe('every endpoint satisfies its schema', () => {
  it('signs in and restores from the cookie', async () => {
    const session = await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);
    expect(session.operator.role).toBe('owner');
    // §8.2: 300s for an admin, against the game client's 900.
    expect(session.expiresIn).toBe(300);

    const restored = await adminApi.auth.restore();
    expect(restored.id).toBe(owner.id);
  });

  it('serves the ops summary', async () => {
    await signIn();
    const summary = await adminApi.ops.summary();

    expect(summary.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(summary.recentSessions.length).toBeGreaterThan(0);
  });

  it('lists and reads every resource', async () => {
    await signIn();

    const players = await adminApi.players.list({ limit: 5 });
    const restaurants = await adminApi.restaurants.list({ limit: 5 });
    const sessions = await adminApi.sessions.list({ limit: 5 });
    const reviews = await adminApi.reviews.list({ limit: 5 });
    const audit = await adminApi.audit.list({ limit: 5 });

    expect(players.items).toHaveLength(5);
    expect(restaurants.items).toHaveLength(5);
    expect(sessions.items).toHaveLength(5);
    expect(reviews.items).toHaveLength(5);
    expect(audit.items).toHaveLength(5);

    const player = players.items[0];
    const restaurant = restaurants.items[0];
    const session = sessions.items[0];
    if (player === undefined || restaurant === undefined || session === undefined) {
      throw new Error('the fixtures must be non-empty');
    }

    await adminApi.players.get(player.id);
    await adminApi.restaurants.get(restaurant.id);
    await adminApi.sessions.get(session.id);
  });

  it('404s a missing record with the standard envelope', async () => {
    await signIn();

    await expect(
      adminApi.players.get('00000000-0000-7000-a000-999999999999'),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('pagination', () => {
  it('walks the whole list without repeating or skipping a row', async () => {
    await signIn();

    const seen: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await adminApi.players.list({
        limit: 20,
        ...(cursor === undefined ? {} : { cursor }),
      });
      seen.push(...page.items.map((row) => row.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);

    expect(seen).toHaveLength(universe.players.length);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('caps the page size at the §12 maximum', async () => {
    await signIn();
    const page = await adminApi.players.list({ limit: 5000 });

    expect(page.items.length).toBeLessThanOrEqual(200);
  });

  it('reports a null cursor on the last page, never an empty string', async () => {
    await signIn();
    const page = await adminApi.players.list({ limit: 500 });

    // An empty-string cursor is truthy and pages forever; the schema rejects it.
    expect(page.nextCursor).toBeNull();
  });
});

describe('filtering and sorting', () => {
  it('filters players by whether they own anything', async () => {
    await signIn();

    const withVenues = await adminApi.players.list({ hasRestaurants: true, limit: 200 });
    const without = await adminApi.players.list({ hasRestaurants: false, limit: 200 });

    expect(withVenues.items.every((row) => row.restaurantCount > 0)).toBe(true);
    expect(without.items.every((row) => row.restaurantCount === 0)).toBe(true);
    expect(withVenues.items.length + without.items.length).toBe(universe.players.length);
  });

  it('sorts money on exact minor units, not lexically', async () => {
    await signIn();
    const page = await adminApi.sessions.list({ sort: 'revenue', order: 'desc', limit: 50 });

    const units = page.items.map((row) => toMinorUnits(row.revenue));
    const sorted = [...units].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    // A lexical sort puts "9" above "18". This is the assertion that catches it.
    expect(units).toEqual(sorted);
  });

  it('puts null values last regardless of direction', async () => {
    await signIn();

    for (const order of ['asc', 'desc'] as const) {
      const page = await adminApi.sessions.list({
        sort: 'averageSatisfaction',
        order,
        limit: 200,
      });

      const firstNull = page.items.findIndex((row) => row.averageSatisfaction === null);
      const lastValue = page.items.map((row) => row.averageSatisfaction).lastIndexOf(null);

      // A descending column that opens with forty empty cells has told the
      // operator nothing.
      if (firstNull !== -1) expect(lastValue).toBe(page.items.length - 1);
    }
  });
});

describe('fidelity to the real seed', () => {
  it('serves the seeded demo restaurant and its menu', async () => {
    await signIn();

    const page = await adminApi.restaurants.list({ q: 'Smokehouse', limit: 10 });
    const demo = page.items.find((row) => row.name === "Declan's Smokehouse (demo)");
    if (demo === undefined) throw new Error('the demo restaurant must be present');

    expect(demo.conceptName).toBe('Southern BBQ');

    const detail = await adminApi.restaurants.get(demo.id);
    const brisket = detail.dishes.find((dish) => dish.name === 'Smoked Brisket Sandwich');
    const danny = detail.staff.find((member) => member.name === 'Danny R.');

    // §7.3: the demo shows the seeded values, not lorem ipsum.
    expect(brisket?.price).toBe('18');
    expect(brisket?.foodCost).toBe('5.4');
    expect(danny?.weeklyCost).toBe(900);
  });

  it('sends money in the UNPADDED wire form Prisma produces', async () => {
    await signIn();
    const page = await adminApi.sessions.list({ limit: 100 });

    // Decimal('18.00').toJSON() is "18". Fixtures that stored "18.00" would be
    // a mock easier to consume than the backend it stands in for, and every
    // formatMoney call would look correct until it met real data.
    for (const row of page.items) {
      expect(row.revenue, row.revenue).not.toMatch(/\.\d*0$/);
      expect(row.profit, row.profit).not.toMatch(/\.\d*0$/);
    }
  });

  it('carries the ten canonical flavour dimensions on a seeded dish', async () => {
    await signIn();
    const page = await adminApi.restaurants.list({ q: 'Smokehouse', limit: 10 });
    const demo = page.items.find((row) => row.name === "Declan's Smokehouse (demo)");
    if (demo === undefined) throw new Error('the demo restaurant must be present');

    const detail = await adminApi.restaurants.get(demo.id);
    const brisket = detail.dishes.find((dish) => dish.name === 'Smoked Brisket Sandwich');

    // The strict FlavorProfileSchema already rejects a wrong key set on parse;
    // this pins the seeded values themselves.
    expect(brisket?.flavorProfile.Smoky).toBe(85);
    expect(brisket?.flavorProfile['Fatty/Rich']).toBe(70);
  });

  it('leaves anonymous device players with no PII at all', async () => {
    await signIn();
    const page = await adminApi.players.list({ provider: 'device', limit: 200 });
    const anonymous = page.items.filter(
      (row) => row.providers.length === 1 && row.providers[0] === 'device',
    );

    // `device`-only IS the anonymous case: it is the one provider that collects
    // nothing, so such a player cannot hold an email or an age bracket. The
    // majority case in a mobile game — a fixture set where everyone has an
    // email would make the role-gated column look like the normal path.
    expect(anonymous.length).toBeGreaterThan(0);
    for (const row of anonymous) {
      expect(row.email, row.id).toBeNull();
      expect(row.ageBracket, row.id).toBeNull();
    }

    // And the converse: anything with a PII-bearing identity has one.
    for (const row of page.items.filter((candidate) => candidate.providers.length > 1)) {
      expect(row.email, row.id).not.toBeNull();
    }
  });

  it('never exposes a subject hash on the identity panel', async () => {
    await signIn();
    const detail = await adminApi.players.get('00000000-0000-7000-a000-000000000001');

    // The backend's own export path excludes it, and a hash of an identity is
    // still an identifier (§6.1, golden rule 6).
    expect(JSON.stringify(detail)).not.toContain('subjectHash');
    expect(detail.identities.every((identity) => Object.keys(identity).length === 3)).toBe(true);
  });
});

describe('the operator roster', () => {
  it('offers one account per role that can sign in, plus a player', async () => {
    // §11 step 2 asks a reviewer to sign in as each of the five roles.
    expect(MOCK_OPERATORS).toHaveLength(OPERATOR_ROLES.length + 1);

    for (const operator of MOCK_OPERATORS) {
      const session = await adminApi.auth.signIn(operator.email, MOCK_PASSWORD);
      expect(session.operator.role).toBe(operator.role);
    }
  });
});
