import { describe, expect, it } from 'vitest';
import { DishSchema, FlavorProfileSchema, StaffSchema } from '@/domain/schemas/catalog';
import { ReviewPatchSchema, ServiceSessionSchema } from '@/domain/schemas/ops';
import {
  ErrorEnvelopeSchema,
  IsoDateTimeSchema,
  MoneySchema,
  pageOf,
} from '@/domain/schemas/primitives';
import { emptyFlavorProfile } from '@/domain/flavor';
import { z } from 'zod';

/**
 * The trust boundary, tested against what the backend actually sends.
 *
 * The high-value cases are the ones where a plausible schema would be WRONG:
 * money that arrives unpadded, a `null` that is not an absent key, and the
 * review patch that golden rule 2 depends on rejecting.
 */

describe('money on the wire', () => {
  it('accepts the unpadded strings Prisma emits', () => {
    // Decimal('18.00').toJSON() is "18". A schema demanding two decimal places
    // — the obvious one to write — would reject every real price.
    for (const value of ['18', '5.4', '30', '-2310', '0']) {
      expect(MoneySchema.safeParse(value).success, value).toBe(true);
    }
  });

  it('rejects a number, which is the mistake it exists to catch', () => {
    expect(MoneySchema.safeParse(18).success).toBe(false);
    expect(MoneySchema.safeParse(18.0).success).toBe(false);
  });

  it('rejects precision the column cannot hold', () => {
    expect(MoneySchema.safeParse('18.005').success).toBe(false);
  });
});

describe('timestamps', () => {
  it('accepts what Date.prototype.toJSON produces', () => {
    expect(IsoDateTimeSchema.safeParse('2026-07-24T20:14:00.000Z').success).toBe(true);
  });

  it('rejects a date-only string where an instant is required', () => {
    expect(IsoDateTimeSchema.safeParse('2026-07-24').success).toBe(false);
  });
});

describe('FlavorProfileSchema', () => {
  it('accepts exactly the ten canonical dimensions', () => {
    expect(FlavorProfileSchema.safeParse(emptyFlavorProfile()).success).toBe(true);
  });

  it('rejects an eleventh dimension rather than letting it reach the radar', () => {
    // Strict, mirroring the backend's own FlavorProfileSchema. An extra key is
    // a contract change, and an axis nobody authored.
    const extra = { ...emptyFlavorProfile(), Funk: 40 };
    expect(FlavorProfileSchema.safeParse(extra).success).toBe(false);
  });

  it('rejects a profile missing a dimension', () => {
    const { Sweet: _Sweet, ...rest } = emptyFlavorProfile();
    expect(FlavorProfileSchema.safeParse(rest).success).toBe(false);
  });
});

describe('DishSchema', () => {
  /** The first row `prisma/seed.ts` writes, serialized as the backend would send it. */
  const SEEDED_BRISKET = {
    id: '00000000-0000-7000-a000-000000000003',
    restaurantId: '00000000-0000-7000-a000-000000000002',
    name: 'Smoked Brisket Sandwich',
    description: 'Slow-smoked brisket, pickles, house BBQ sauce.',
    ingredients: ['brisket', 'brioche bun', 'pickles', 'bbq sauce'],
    cookingMethod: 'smoked',
    flavorProfile: {
      ...emptyFlavorProfile(),
      Salty: 60,
      Umami: 75,
      Smoky: 85,
      'Fatty/Rich': 70,
      Spicy: 25,
      Sweet: 20,
    },
    price: '18',
    foodCost: '5.4',
    foodCostPercentage: '30',
    timesOrdered: 0,
    averageRating: null,
    isActive: true,
    createdAt: '2026-07-24T20:14:00.000Z',
    updatedAt: '2026-07-24T20:14:00.000Z',
  };

  it('parses the real seeded dish, unpadded money and all', () => {
    expect(DishSchema.safeParse(SEEDED_BRISKET).success).toBe(true);
  });

  it('distinguishes an explicit null from an absent key', () => {
    // Prisma sends `"description": null`, not an omitted key. `.nullable()` and
    // `.optional()` are different on the wire, and conflating them is how a
    // `!== undefined` check starts passing for a genuinely unset field.
    const { averageRating: _omitted, ...withoutKey } = SEEDED_BRISKET;

    expect(DishSchema.safeParse({ ...SEEDED_BRISKET, averageRating: null }).success).toBe(true);
    expect(DishSchema.safeParse(withoutKey).success).toBe(false);
  });
});

describe('StaffSchema', () => {
  it('keeps role as free text, because the canon does not enumerate it', () => {
    // The GDD says "4 roles" and never lists them; Unity has an enum, Prisma
    // has a String. §6.2 renders it beside a DecisionFlag — narrowing it here
    // would present an unsettled decision as settled (golden rule 5).
    const staff = {
      id: '00000000-0000-7000-a000-000000000009',
      restaurantId: '00000000-0000-7000-a000-000000000002',
      name: 'Danny R.',
      role: 'Chef',
      speed: 70,
      skill: 82,
      friendliness: 60,
      reliability: 75,
      weeklyCost: 900,
      morale: 70,
      tenureDays: 0,
      isActive: true,
      createdAt: '2026-07-24T20:14:00.000Z',
      updatedAt: '2026-07-24T20:14:00.000Z',
    };

    expect(StaffSchema.safeParse(staff).success).toBe(true);
    expect(StaffSchema.safeParse({ ...staff, role: 'Sommelier' }).success).toBe(true);
  });
});

describe('ServiceSessionSchema', () => {
  it('accepts a negative reputationChange', () => {
    // Signed, and the one field where this repo's away-from-zero rounding could
    // disagree with the backend's toward-+∞ rounding. A schema clamping it to
    // non-negative would hide a real loss.
    const session = {
      id: '00000000-0000-7000-a000-00000000000a',
      restaurantId: '00000000-0000-7000-a000-000000000002',
      date: '2026-07-24T20:14:00.000Z',
      coversServed: 42,
      revenue: '1840',
      foodCost: '480',
      beverageCost: '180',
      laborCost: '320',
      profit: '860',
      averageSatisfaction: 74,
      reputationChange: -5,
      eventsTriggered: ['birthday'],
      healthInspectionResult: null,
      createdAt: '2026-07-24T20:14:00.000Z',
    };

    expect(ServiceSessionSchema.safeParse(session).success).toBe(true);
  });
});

describe('ReviewPatchSchema — golden rule 2 at the trust boundary', () => {
  it('accepts the two fields a moderator may change', () => {
    expect(ReviewPatchSchema.safeParse({ isFeatured: true }).success).toBe(true);
    expect(ReviewPatchSchema.safeParse({ reviewText: '[redacted]' }).success).toBe(true);
    expect(ReviewPatchSchema.safeParse({ reviewText: null }).success).toBe(true);
  });

  it('REFUSES a score, which is the whole point', () => {
    // §8.4: "any other key is a VALIDATION_ERROR". A non-strict object would
    // let this ride along silently to a server that does not exist yet.
    expect(ReviewPatchSchema.safeParse({ isFeatured: true, overallScore: 100 }).success).toBe(
      false,
    );
    expect(ReviewPatchSchema.safeParse({ serviceRating: 90 }).success).toBe(false);
  });

  it('refuses an empty patch', () => {
    expect(ReviewPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe('the page envelope', () => {
  const schema = pageOf(z.object({ id: z.string() }));

  it('treats a null cursor as the last page', () => {
    const parsed = schema.safeParse({ items: [{ id: 'a' }], nextCursor: null, total: 1 });
    expect(parsed.success).toBe(true);
  });

  it('allows a missing total, because counting is a second query', () => {
    expect(schema.safeParse({ items: [], nextCursor: null }).success).toBe(true);
  });

  it('rejects an empty-string cursor, which reads as truthy and pages forever', () => {
    expect(schema.safeParse({ items: [], nextCursor: '' }).success).toBe(false);
  });
});

describe('the error envelope', () => {
  it('parses the shape errorHandler.ts actually builds', () => {
    expect(
      ErrorEnvelopeSchema.safeParse({
        error: {
          message: 'Request body failed validation',
          code: 'VALIDATION_ERROR',
          details: [{ path: 'email', message: 'Invalid email' }],
        },
      }).success,
    ).toBe(true);
  });

  it('parses a 5xx, where code and details are both dropped', () => {
    expect(
      ErrorEnvelopeSchema.safeParse({ error: { message: 'Internal Server Error' } }).success,
    ).toBe(true);
  });

  it('rejects a bare string body', () => {
    expect(ErrorEnvelopeSchema.safeParse('Internal Server Error').success).toBe(false);
  });
});
