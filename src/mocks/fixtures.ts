import { ARCHETYPES, AGE_BRACKETS, type Role } from '@/domain/enums';
import { FLAVOR_DIMENSIONS, type FlavorProfile } from '@/domain/flavor';
import type {
  Ambience,
  AuditEntry,
  Concept,
  Dish,
  Drink,
  Guest,
  Operator,
  Player,
  Restaurant,
  Review,
  ServiceSession,
  Staff,
} from '@/domain/types';
import { CONCEPT_SEEDS } from '@/mocks/concepts';
import { asWireDecimal, createRandom, daysAgo, fixtureId, type Random } from '@/mocks/random';
import { addMoney, subtractMoney, sumMoney } from '@/lib/money';
import { OPERATOR_ROLES } from '@/lib/permissions';

/**
 * The mock universe. Deterministic, and grown from the real `prisma/seed.ts`.
 *
 * ── What "faithful" means here ──────────────────────────────────────────────
 * §7.3: the demo shows `Declan's Smokehouse (demo)`, `Smoked Brisket Sandwich`
 * at $18, and `Danny R.` at `weeklyCost 900` — not lorem ipsum — so a reviewer
 * comparing this console to a seeded database sees the same rows.
 *
 * It goes one step further than the plan asks, in the direction that matters:
 * **every money value is stored in the WIRE form, trailing zeros stripped.**
 * The seeded brisket price is the two characters `"18"`, because that is what
 * Prisma's `Decimal.toJSON` produces. A fixture set holding `"18.00"` would be
 * easier to consume than the backend it stands in for, and every `formatMoney`
 * call would look correct until the day it met real data.
 *
 * ── What the real seed does NOT have ────────────────────────────────────────
 * `prisma/seed.ts` creates 10 concepts, 1 player, 1 restaurant, 3 dishes, 1
 * drink, 2 staff — and **zero** guests, service sessions, and reviews. A
 * console demoed on that would have an empty Live Ops, an empty moderation
 * queue, and no list long enough to page. So the seeded rows are the anchor and
 * the rest is generated around them, seeded so it never moves.
 */

/* ── Identifiers that must match the real seed ───────────────────────────── */

/** `prisma/seed.ts:DEMO_PLAYER_ID` — fixed so re-seeding upserts. */
const DEMO_PLAYER_ID = '00000000-0000-7000-a000-000000000001';
const DEMO_RESTAURANT_ID = '00000000-0000-7000-a000-000000000002';

/** UUID namespaces, so two entity types at the same index cannot collide. */
const KIND = {
  operator: 1,
  player: 2,
  concept: 3,
  restaurant: 4,
  dish: 5,
  drink: 6,
  staff: 7,
  ambience: 8,
  guest: 9,
  session: 10,
  review: 11,
  audit: 12,
} as const;

/* ── Operators ───────────────────────────────────────────────────────────── */

/**
 * AUTHORED (§12). One account per role that can sign in, plus a `player` one so
 * the "signed in, but this console is not for you" path is demonstrable rather
 * than theoretical.
 *
 * The password is shared and printed on the sign-in screen **in mock mode
 * only**. There is no secret to protect: `rbs-backend` has no admin auth at
 * all, so nothing here guards anything — and §11 step 2 asks a reviewer to sign
 * in as each of the five roles, which they cannot do without being told how.
 */
export const MOCK_PASSWORD = 'operator';

export const MOCK_OPERATORS: readonly (Operator & { readonly password: string })[] = [
  ...OPERATOR_ROLES,
  'player' as Role,
].map((role, index) => ({
  id: fixtureId(KIND.operator, index + 1),
  email: `${role}@rbs.local`,
  username: `${role.charAt(0).toUpperCase()}${role.slice(1)} Operator`,
  role,
  password: MOCK_PASSWORD,
}));

/* ── Vocabularies ────────────────────────────────────────────────────────── */

const FIRST_NAMES = [
  'Danny',
  'Lena',
  'Sasha',
  'Marcus',
  'Priya',
  'Tomás',
  'Aoife',
  'Kenji',
  'Nadia',
  'Ruth',
  'Bilal',
  'Corey',
  'Ingrid',
  'Yusuf',
  'Mei',
  'Oskar',
  'Rosa',
  'Theo',
  'Imani',
  'Jonas',
];

const LAST_INITIALS = ['R.', 'K.', 'M.', 'A.', 'S.', 'T.', 'D.', 'B.', 'L.', 'N.'];

/** Free text, per `schema.prisma` — the GDD says "4 roles" and never lists them. */
const STAFF_ROLES = ['Chef', 'Bartender', 'Server', 'Manager'];

const VENUE_PREFIXES = [
  'The Ember',
  'Copper',
  'The Salted',
  'Nine',
  'The Gilded',
  'Harbour',
  'The Velvet',
  'Old Quarter',
  'The Brass',
  'Wren &',
  'The Amber',
  'Foundry',
];

const VENUE_SUFFIXES = ['Room', 'Kitchen', 'Table', 'House', 'Bar & Grill', 'Social', 'Tavern'];

const DISH_NAMES = [
  'Charred Aubergine',
  'Pan-Seared Salmon',
  'Duck Confit Hash',
  'Wild Mushroom Ragù',
  'Buttermilk Chicken',
  'Braised Short Rib',
  'Heirloom Tomato Salad',
  'Lamb Kofta',
  'Cacio e Pepe',
  'Blackened Snapper',
  'Smoked Aubergine Dip',
  'Pork Belly Bao',
];

const DRINK_NAMES = [
  'Smoky Maple Old Fashioned',
  'Garden Gimlet',
  'Paloma Bianca',
  'Amber Negroni',
  'Cucumber Collins',
  'Spiced Pear Sour',
  'Ember Manhattan',
];

const SPIRITS = ['Bourbon', 'Gin', 'Tequila', 'Rye', 'Mezcal', 'Vodka'];
const GARNISHES = ['Orange peel', 'Charred rosemary', 'Lime wheel', 'Dehydrated apple', 'Mint'];
const GLASSWARE = ['Rocks', 'Coupe', 'Highball', 'Nick & Nora'];
const INSPECTIONS = ['Pass', 'Pass with notes', 'Fail'];

/** From `balancing.json` — the nine authored events, four of which are untuned. */
const EVENTS = [
  'birthday',
  'rescuedTable',
  'criticVisit',
  'regularReturn',
  'equipmentFailure',
  'vipGuest',
  'healthInspection',
  'rushHour',
];

const REVIEW_OPENERS = [
  'Came in on a whim and left planning the next visit.',
  'The room was busier than I expected, and the kitchen kept up.',
  'Service was warm without hovering, which is harder than it looks.',
  'Everything arrived hot, which sounds like a low bar until it is missed.',
  'Would happily bring my parents here, and separately my colleagues.',
  'The bar carried the evening — the kitchen was fine, the bar was the reason.',
];

/* ── Small helpers ───────────────────────────────────────────────────────── */

function flavorProfile(random: Random): FlavorProfile {
  return Object.fromEntries(
    FLAVOR_DIMENSIONS.map((dimension) => [dimension, random.int(0, 100)]),
  ) as FlavorProfile;
}

function personName(random: Random): string {
  return `${random.pick(FIRST_NAMES)} ${random.pick(LAST_INITIALS)}`;
}

/* ── The universe ────────────────────────────────────────────────────────── */

export interface Universe {
  readonly concepts: readonly Concept[];
  readonly players: readonly Player[];
  readonly restaurants: readonly Restaurant[];
  readonly dishes: readonly Dish[];
  readonly drinks: readonly Drink[];
  readonly staff: readonly Staff[];
  readonly ambience: readonly Ambience[];
  readonly guests: readonly Guest[];
  readonly sessions: readonly ServiceSession[];
  readonly reviews: readonly Review[];
  readonly audit: readonly AuditEntry[];
  /** `playerId → provider[]`, for the §6.1 identity glyph row. */
  readonly identityProviders: ReadonlyMap<
    string,
    readonly ('device' | 'password' | 'google' | 'apple')[]
  >;
}

function buildUniverse(): Universe {
  const random = createRandom(20260805);

  /* Concepts — the real ten, in order. */
  const concepts: Concept[] = CONCEPT_SEEDS.map((seed, index) => ({
    id: fixtureId(KIND.concept, index + 1),
    name: seed.name,
    cuisineTags: [...seed.cuisineTags],
    vibeTags: [...seed.vibeTags],
    priceBracket: seed.priceBracket,
    targetArchetypes: [...seed.targetArchetypes],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(180),
  }));

  const bbq = concepts[1];
  if (bbq === undefined) throw new Error('Southern BBQ must be the second seeded concept');

  /* Players — the demo one first, so it is the row a reviewer lands on. */
  const players: Player[] = [
    {
      id: DEMO_PLAYER_ID,
      username: 'demo_chef',
      email: null,
      ageBracket: null,
      ageGateAt: null,
      aiTier: 'free',
      role: 'player',
      createdAt: daysAgo(60),
      lastActive: daysAgo(0, -35),
    },
  ];

  const identityProviders = new Map<
    string,
    readonly ('device' | 'password' | 'google' | 'apple')[]
  >([[DEMO_PLAYER_ID, ['device']]]);

  for (let index = 1; index < 74; index += 1) {
    const id = fixtureId(KIND.player, index);
    const anonymous = random.bool(0.35);
    const created = random.int(1, 220);

    // An anonymous device player carries NO PII — no email, no age bracket.
    // That is the majority case in a mobile game, and a fixture set where every
    // player has an email would make the role-gated email column look like the
    // normal path rather than the exception it is.
    players.push({
      id,
      username: anonymous ? null : `${random.pick(FIRST_NAMES).toLowerCase()}_${String(index)}`,
      email: anonymous ? null : `player${String(index)}@example.com`,
      ageBracket: anonymous ? null : random.pick(AGE_BRACKETS),
      ageGateAt: anonymous ? null : daysAgo(created),
      aiTier: random.bool(0.18) ? 'premium' : 'free',
      role: 'player',
      createdAt: daysAgo(created),
      lastActive: daysAgo(random.int(0, Math.min(created, 40)), -random.int(0, 600)),
    });

    /*
     * `device`-only ⟺ anonymous, and that biconditional is load-bearing.
     *
     * It is the COPPA/GDPR invariant the schema encodes: `device` is the one
     * provider that collects nothing, so a player whose only identity is a
     * device CANNOT have an email or an age bracket. Sampling providers freely
     * would produce device-only players carrying an email — data the real
     * backend can never hold, and a fixture that quietly licenses a screen to
     * assume it can.
     */
    identityProviders.set(
      id,
      anonymous
        ? ['device']
        : [
            ...random.sample(['password', 'google', 'apple'] as const, 1),
            ...(random.bool(0.4) ? (['device'] as const) : []),
          ],
    );
  }

  /* Restaurants — the demo one first, then one for roughly half the players. */
  const restaurants: Restaurant[] = [
    {
      id: DEMO_RESTAURANT_ID,
      playerId: DEMO_PLAYER_ID,
      conceptId: bbq.id,
      name: "Declan's Smokehouse (demo)",
      priceLevel: '$$',
      targetAudience: 'Regulars & families',
      reputationScore: 20,
      totalRevenue: '0',
      totalServicesRun: 0,
      cleanliness: 80,
      freshness: 80,
      handling: 80,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(0, -35),
    },
  ];

  for (let index = 1; index < 46; index += 1) {
    const owner = players[random.int(1, players.length - 1)];
    const concept = random.pick(concepts);
    if (owner === undefined) continue;

    restaurants.push({
      id: fixtureId(KIND.restaurant, index),
      playerId: owner.id,
      conceptId: concept.id,
      name: `${random.pick(VENUE_PREFIXES)} ${random.pick(VENUE_SUFFIXES)}`,
      // Nullable and free-text in the schema, which is exactly why §6.1 renders
      // it with a DecisionFlag — some rows genuinely have none.
      priceLevel: random.bool(0.8) ? random.pick(['$', '$$', '$$$', '$$$$']) : null,
      targetAudience: random.bool(0.7)
        ? random.pick(['Regulars & families', 'Date night', 'Tourists', 'After-work crowd'])
        : null,
      reputationScore: random.int(0, 100),
      totalRevenue: '0',
      totalServicesRun: 0,
      cleanliness: random.int(35, 100),
      freshness: random.int(35, 100),
      handling: random.int(35, 100),
      createdAt: daysAgo(random.int(30, 200)),
      updatedAt: daysAgo(random.int(0, 20)),
    });
  }

  /* Menu, staff, ambience. The demo restaurant gets the real seeded rows. */
  const dishes: Dish[] = [];
  const drinks: Drink[] = [];
  const staff: Staff[] = [];
  const ambience: Ambience[] = [];

  // The three dishes `prisma/seed.ts` actually writes, money in wire form.
  const SEEDED_DISHES = [
    {
      name: 'Smoked Brisket Sandwich',
      description: 'Slow-smoked brisket, pickles, house BBQ sauce.',
      ingredients: ['brisket', 'brioche bun', 'pickles', 'bbq sauce'],
      cookingMethod: 'smoked',
      price: '18',
      foodCost: '5.4',
      pct: '30',
      profile: { Salty: 60, Umami: 75, Smoky: 85, 'Fatty/Rich': 70, Spicy: 25, Sweet: 20 },
    },
    {
      name: 'Fried Green Tomato Appetizer',
      description: 'Cornmeal-crusted green tomatoes, remoulade.',
      ingredients: ['green tomato', 'cornmeal', 'remoulade'],
      cookingMethod: 'fried',
      price: '12',
      foodCost: '3.6',
      pct: '30',
      profile: { Acidic: 65, Salty: 45, 'Fatty/Rich': 55, Fresh: 40 },
    },
    {
      name: 'House Cheeseburger',
      description: 'Two smashed patties, aged cheddar, house pickles.',
      ingredients: ['beef', 'cheddar', 'brioche bun', 'pickles'],
      cookingMethod: 'grilled',
      price: '14',
      foodCost: '4.9',
      pct: '35',
      profile: { Salty: 70, Umami: 80, 'Fatty/Rich': 80, Sweet: 15 },
    },
  ];

  const emptyProfile = Object.fromEntries(FLAVOR_DIMENSIONS.map((d) => [d, 0])) as FlavorProfile;

  SEEDED_DISHES.forEach((seed, index) => {
    dishes.push({
      id: fixtureId(KIND.dish, index + 1),
      restaurantId: DEMO_RESTAURANT_ID,
      name: seed.name,
      description: seed.description,
      ingredients: seed.ingredients,
      cookingMethod: seed.cookingMethod,
      flavorProfile: { ...emptyProfile, ...seed.profile },
      price: seed.price,
      foodCost: seed.foodCost,
      foodCostPercentage: seed.pct,
      timesOrdered: 0,
      averageRating: null,
      isActive: true,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(60),
    });
  });

  drinks.push({
    id: fixtureId(KIND.drink, 1),
    restaurantId: DEMO_RESTAURANT_ID,
    name: 'Bourbon Peach Smash',
    baseSpirit: 'Bourbon',
    flavorElements: ['peach', 'mint', 'lemon', 'bitters'],
    garnish: 'Mint',
    glassware: 'Rocks',
    price: '14',
    beverageCost: '2.8',
    timesOrdered: 0,
    averageRating: null,
    isActive: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60),
  });

  [
    {
      name: 'Danny R.',
      role: 'Chef',
      weeklyCost: 900,
      speed: 68,
      skill: 82,
      friendliness: 55,
      reliability: 74,
    },
    {
      name: 'Lena K.',
      role: 'Server',
      weeklyCost: 650,
      speed: 78,
      skill: 61,
      friendliness: 88,
      reliability: 70,
    },
  ].forEach((seed, index) => {
    staff.push({
      id: fixtureId(KIND.staff, index + 1),
      restaurantId: DEMO_RESTAURANT_ID,
      ...seed,
      morale: 70,
      tenureDays: 0,
      isActive: true,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(60),
    });
  });

  ambience.push({
    id: fixtureId(KIND.ambience, 1),
    restaurantId: DEMO_RESTAURANT_ID,
    lighting: 'Warm',
    musicGenre: 'Country',
    musicVolume: 40,
    decorStyle: 'Rustic',
    seatingStyle: 'Booth',
    noiseLevel: 45,
    themeNight: 'None',
    wallArt: 'Vintage signage',
    uniforms: 'Casual',
    guestEnergy: 55,
    ambienceScore: null,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60),
  });

  let dishIndex = SEEDED_DISHES.length;
  let drinkIndex = 1;
  let staffIndex = 2;
  let guestIndex = 0;
  const guests: Guest[] = [];

  for (const restaurant of restaurants) {
    if (restaurant.id === DEMO_RESTAURANT_ID) continue;

    for (const name of random.sample(DISH_NAMES, random.int(3, 7))) {
      dishIndex += 1;
      const price = asWireDecimal(random.decimal(9, 42));
      const foodCost = asWireDecimal(random.decimal(2.5, 14));

      dishes.push({
        id: fixtureId(KIND.dish, dishIndex),
        restaurantId: restaurant.id,
        name,
        description: null,
        ingredients: [
          ...random.sample(
            ['garlic', 'butter', 'thyme', 'lemon', 'chilli', 'shallot', 'cream'],
            random.int(2, 5),
          ),
        ],
        cookingMethod: random.pick(['seared', 'braised', 'roasted', 'grilled', 'raw']),
        flavorProfile: flavorProfile(random),
        price,
        foodCost,
        // A FIGURE, not a ratio: 30 means 30%. Against the 32% target from
        // balancing.json, so some rows breach it and the HealthMeter has
        // something to say.
        foodCostPercentage: asWireDecimal(random.decimal(18, 48)),
        timesOrdered: random.int(0, 900),
        averageRating: random.bool(0.75) ? asWireDecimal(random.decimal(2.4, 5)) : null,
        isActive: random.bool(0.88),
        createdAt: daysAgo(random.int(20, 180)),
        updatedAt: daysAgo(random.int(0, 20)),
      });
    }

    for (const name of random.sample(DRINK_NAMES, random.int(1, 4))) {
      drinkIndex += 1;

      drinks.push({
        id: fixtureId(KIND.drink, drinkIndex),
        restaurantId: restaurant.id,
        name,
        baseSpirit: random.pick(SPIRITS),
        // Capped at four by the Drink Builder (§6.2) — a UI constraint the
        // fixtures respect so the editor never opens on invalid data.
        flavorElements: [
          ...random.sample(
            ['peach', 'mint', 'lemon', 'bitters', 'honey', 'basil', 'grapefruit'],
            random.int(2, 4),
          ),
        ],
        garnish: random.pick(GARNISHES),
        glassware: random.pick(GLASSWARE),
        price: asWireDecimal(random.decimal(9, 22)),
        beverageCost: asWireDecimal(random.decimal(1.8, 6)),
        timesOrdered: random.int(0, 400),
        averageRating: random.bool(0.7) ? asWireDecimal(random.decimal(2.6, 5)) : null,
        isActive: random.bool(0.9),
        createdAt: daysAgo(random.int(20, 180)),
        updatedAt: daysAgo(random.int(0, 20)),
      });
    }

    for (let n = 0; n < random.int(2, 5); n += 1) {
      staffIndex += 1;

      staff.push({
        id: fixtureId(KIND.staff, staffIndex),
        restaurantId: restaurant.id,
        name: personName(random),
        role: random.pick(STAFF_ROLES),
        speed: random.int(30, 98),
        skill: random.int(30, 98),
        friendliness: random.int(30, 98),
        reliability: random.int(30, 98),
        // The sole wage authority (golden rule 4). Int, whole dollars a week.
        weeklyCost: random.int(480, 1400),
        // Some in balancing.json's "Burnt Out" band (0–19), so the Ops alert
        // strip has real anomalies rather than a permanently empty row.
        morale: random.bool(0.12) ? random.int(0, 19) : random.int(35, 95),
        tenureDays: random.int(0, 400),
        isActive: random.bool(0.92),
        createdAt: daysAgo(random.int(10, 180)),
        updatedAt: daysAgo(random.int(0, 20)),
      });
    }

    ambience.push({
      id: fixtureId(KIND.ambience, restaurants.indexOf(restaurant) + 1),
      restaurantId: restaurant.id,
      lighting: random.pick(['Bright', 'Warm', 'Dim', 'Dramatic']),
      musicGenre: random.pick(['Jazz', 'Country', 'Soul', 'Ambient', 'Rock']),
      musicVolume: random.int(10, 90),
      decorStyle: random.pick(['Rustic', 'Modern', 'Minimal', 'Vintage', 'Industrial']),
      seatingStyle: random.pick(['Formal', 'Casual', 'Booth', 'Bar', 'Outdoor']),
      noiseLevel: random.int(15, 90),
      themeNight: random.pick(['None', 'Live Music', 'Quiz', 'Sports', 'Tasting']),
      wallArt: random.bool(0.6)
        ? random.pick(['Vintage signage', 'Local photography', 'Murals'])
        : null,
      uniforms: random.pick(['Casual', 'Smart-Casual', 'Formal', 'Themed']),
      guestEnergy: random.int(20, 95),
      ambienceScore: random.bool(0.8) ? random.int(30, 95) : null,
      createdAt: daysAgo(random.int(20, 180)),
      updatedAt: daysAgo(random.int(0, 20)),
    });

    const restaurantDishes = dishes.filter((dish) => dish.restaurantId === restaurant.id);
    const restaurantDrinks = drinks.filter((drink) => drink.restaurantId === restaurant.id);

    for (let n = 0; n < random.int(0, 9); n += 1) {
      guestIndex += 1;
      const visits = random.int(0, 14);

      guests.push({
        id: fixtureId(KIND.guest, guestIndex),
        restaurantId: restaurant.id,
        name: personName(random),
        archetype: random.pick(ARCHETYPES),
        visitCount: visits,
        favoriteDishId:
          restaurantDishes.length > 0 && random.bool(0.6) ? random.pick(restaurantDishes).id : null,
        favoriteDrinkId:
          restaurantDrinks.length > 0 && random.bool(0.4) ? random.pick(restaurantDrinks).id : null,
        satisfactionHistory: Array.from({ length: Math.min(visits, 12) }, () =>
          random.int(20, 100),
        ),
        specialOccasions: null,
        // `balancing.json`'s regularGuest.visitCountGreaterThan is 3.
        isRegular: visits > 3,
        createdAt: daysAgo(random.int(5, 150)),
        updatedAt: daysAgo(random.int(0, 10)),
      });
    }
  }

  /* Services, and the reviews they produced. */
  const sessions: ServiceSession[] = [];
  const reviews: Review[] = [];
  const revenueByRestaurant = new Map<string, string>();
  const servicesByRestaurant = new Map<string, number>();
  let sessionIndex = 0;
  let reviewIndex = 0;

  for (const restaurant of restaurants) {
    if (restaurant.id === DEMO_RESTAURANT_ID) continue;

    for (let n = 0; n < random.int(2, 16); n += 1) {
      sessionIndex += 1;

      const covers = random.int(8, 96);
      const revenue = asWireDecimal(random.decimal(covers * 12, covers * 46));
      const foodCost = asWireDecimal(random.decimal(covers * 3, covers * 14));
      const beverageCost = asWireDecimal(random.decimal(covers * 1, covers * 7));
      const laborCost = asWireDecimal(random.decimal(covers * 2, covers * 11));

      // Computed with the exact arithmetic, never with floats — these are the
      // figures §11 step 4 asks a reviewer to check against the database with
      // Decimal precision intact.
      const profit = asWireDecimal(
        subtractMoney(revenue, sumMoney([foodCost, beverageCost, laborCost])),
      );

      const guestsScored = random.bool(0.94);
      const restaurantGuests = guests.filter((guest) => guest.restaurantId === restaurant.id);
      const session: ServiceSession = {
        id: fixtureId(KIND.session, sessionIndex),
        restaurantId: restaurant.id,
        date: daysAgo(random.int(0, 45), -random.int(0, 300)),
        coversServed: covers,
        revenue,
        foodCost,
        beverageCost,
        laborCost,
        profit,
        averageSatisfaction: guestsScored ? random.int(18, 99) : null,
        // Signed, and the only field where the two repos' rounding conventions
        // could disagree — see lib/number.ts.
        reputationChange: random.int(-9, 11),
        eventsTriggered: random.bool(0.55) ? [...random.sample(EVENTS, random.int(1, 3))] : [],
        healthInspectionResult: random.bool(0.14) ? random.pick(INSPECTIONS) : null,
        createdAt: daysAgo(random.int(0, 45)),
      };

      sessions.push(session);

      revenueByRestaurant.set(
        restaurant.id,
        asWireDecimal(addMoney(revenueByRestaurant.get(restaurant.id) ?? '0', revenue)),
      );
      servicesByRestaurant.set(restaurant.id, (servicesByRestaurant.get(restaurant.id) ?? 0) + 1);

      for (let r = 0; r < random.int(0, 5); r += 1) {
        const guest = restaurantGuests.length > 0 ? random.pick(restaurantGuests) : null;
        if (guest === null) break;

        reviewIndex += 1;
        const hasText = random.bool(0.72);

        reviews.push({
          id: fixtureId(KIND.review, reviewIndex),
          sessionId: session.id,
          guestId: guest.id,
          dishRatings: null,
          drinkRatings: null,
          serviceRating: random.int(20, 100),
          ambienceRating: random.int(20, 100),
          overallScore: random.int(15, 100),
          reviewText: hasText ? random.pick(REVIEW_OPENERS) : null,
          isFeatured: hasText && random.bool(0.15),
          createdAt: session.date,
        });
      }
    }
  }

  /* Roll the session totals back onto the restaurants, so the two agree. */
  const withTotals: Restaurant[] = restaurants.map((restaurant) => ({
    ...restaurant,
    totalRevenue: revenueByRestaurant.get(restaurant.id) ?? '0',
    totalServicesRun: servicesByRestaurant.get(restaurant.id) ?? 0,
  }));

  /* Audit — the trail golden rule 7 says every write leaves. */
  const audit: AuditEntry[] = [];

  for (let index = 1; index <= 48; index += 1) {
    const actor = random.pick(MOCK_OPERATORS.filter((operator) => operator.role !== 'player'));
    const review = reviews[random.int(0, reviews.length - 1)];

    audit.push({
      id: fixtureId(KIND.audit, index),
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: random.pick([
        'review.moderate',
        'player.export',
        'player.delete',
        'balancing.publish',
      ]),
      entityType: 'review',
      entityId: review?.id ?? null,
      before: null,
      after: null,
      ip: '10.0.0.12',
      userAgent: 'Mozilla/5.0 (operator console)',
      createdAt: daysAgo(random.int(0, 30), -random.int(0, 900)),
    });
  }

  return {
    concepts,
    players,
    restaurants: withTotals,
    dishes,
    drinks,
    staff,
    ambience,
    guests,
    sessions,
    reviews,
    audit,
    identityProviders,
  };
}

/**
 * Built once per module load, and never mutated by a handler.
 *
 * `reviews.patch` is the only mutation the console has, and it writes into a
 * separate overlay in `handlers.ts` rather than into this object — so a reload
 * restores the pristine demo, and one test's moderation cannot change what the
 * next test reads.
 */
export const universe: Universe = buildUniverse();
