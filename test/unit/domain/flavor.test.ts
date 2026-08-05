import { describe, expect, it } from 'vitest';
import {
  FLAVOR_DIMENSIONS,
  FLAVOR_DIMENSION_LABELS,
  emptyFlavorProfile,
  toFlavorArray,
} from '@/domain/flavor';

/**
 * The ten dimensions, pinned against the canon in the other two repos.
 *
 * Phase 1 shipped an invented list here — `Salt`, `Sour`, `Heat`, `Fat`,
 * `Smoke`, `Herb`, `Acid`, in an invented order — and nothing caught it,
 * because the only assertion was that the array equalled itself. These tests
 * assert against the values Unity and the backend independently agree on, which
 * is the only version of this test that could have failed.
 */

/**
 * `rbs-game/…/Core/Enums/FlavorDimension.cs` — `Sweet = 0 … Fresh = 9`,
 * commented "Do NOT reorder or renumber", sourced from `08_Content_Data.md`
 * §8.4. Byte-identical to `rbs-backend/src/config/balancing.json`'s
 * `flavorDimensions`, which closes the backend's `FlavorProfileSchema` and is
 * what `prisma/seed.ts` writes into `Dish.flavorProfile`.
 *
 * Transcribed as a literal, not imported: a test that derives its expectation
 * from the thing under test asserts nothing.
 */
const CANON = [
  'Sweet',
  'Salty',
  'Acidic',
  'Bitter',
  'Umami',
  'Spicy',
  'Smoky',
  'Fatty/Rich',
  'Herbal',
  'Fresh',
];

describe('flavour dimensions', () => {
  it('matches the canon in name and order', () => {
    expect(FLAVOR_DIMENSIONS).toEqual(CANON);
  });

  it('carries the slash in the wire key, not in the display label', () => {
    // Unity spells this member `FattyRich` because a C# identifier cannot hold
    // a slash. The JSONB key can, and does — so the wire key keeps it and the
    // label is where it becomes readable.
    expect(FLAVOR_DIMENSIONS).toContain('Fatty/Rich');
    expect(FLAVOR_DIMENSION_LABELS['Fatty/Rich']).toBe('Fatty / Rich');
  });

  it('labels every dimension', () => {
    // The Record type already makes a missing label a compile error. This
    // catches the other half: a label that exists but is empty.
    for (const dimension of FLAVOR_DIMENSIONS) {
      expect(FLAVOR_DIMENSION_LABELS[dimension].length).toBeGreaterThan(0);
    }
  });

  it('serialises positionally in canonical order', () => {
    // Unity's FlavorAnchorTable is a positional int[10] and the catalogue
    // export is index-based, so a reorder silently rewrites every anchor.
    const profile = { ...emptyFlavorProfile(), Sweet: 72, Fresh: 30 };

    expect(toFlavorArray(profile)).toEqual([72, 0, 0, 0, 0, 0, 0, 0, 0, 30]);
  });

  it('starts a new dish at all zeroes', () => {
    expect(toFlavorArray(emptyFlavorProfile())).toEqual(Array.from({ length: 10 }, () => 0));
  });
});
