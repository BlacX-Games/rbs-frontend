import { describe, expect, it } from 'vitest';
import { countChanges, diffJson } from '@/components/patterns/internal/diff';
import { toCsv } from '@/components/patterns/internal/csv';
import { FLAVOR_DIMENSIONS, emptyFlavorProfile, toFlavorArray } from '@/components/patterns/flavor';

/**
 * The pure logic under the data patterns.
 *
 * Tested apart from the components because these are where the real hazards
 * live — a CSV that corrupts on the first comma, a diff that reports a reformat
 * as a change, an array whose order silently rewrites Unity's anchor table.
 */

describe('toCsv', () => {
  it('quotes a field containing a comma', () => {
    // "Declan's Smokehouse, Bar & Grill" is an ordinary restaurant name, and an
    // unquoted export splits it into two columns from that row onward.
    expect(toCsv(['name'], [['Smokehouse, Bar & Grill']])).toBe(
      'name\r\n"Smokehouse, Bar & Grill"',
    );
  });

  it('doubles an embedded quote', () => {
    expect(toCsv(['text'], [['He said "dry"']])).toBe('text\r\n"He said ""dry"""');
  });

  it('quotes a field containing a newline', () => {
    // Review text is multi-line by nature.
    expect(toCsv(['text'], [['Brisket was dry.\nService saved it.']])).toBe(
      'text\r\n"Brisket was dry.\nService saved it."',
    );
  });

  it('neutralises a leading formula character', () => {
    // CSV injection: a spreadsheet reads `=1+1` as a formula, so operator- or
    // player-authored text becomes executable the moment someone opens the
    // export in Excel. A tab prefix makes it inert without losing the text.
    for (const dangerous of ['=cmd()', '+1', '-1', '@SUM(A1)']) {
      expect(toCsv(['t'], [[dangerous]]), dangerous).toBe(`t\r\n\t${dangerous}`);
    }
  });

  it('uses CRLF, as RFC 4180 specifies', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\r\n1,2');
  });
});

describe('diffJson', () => {
  it('reports a changed leaf by path', () => {
    const entries = diffJson(
      { reputation: { gainFactor: 0.15 } },
      { reputation: { gainFactor: 0.18 } },
    );

    // The Studio's headline case: gainFactor 0.15 → 0.18 is the change that
    // shifts every golden value, so it has to surface by its dotted path.
    expect(entries).toEqual([
      { path: 'reputation.gainFactor', kind: 'changed', before: '0.15', after: '0.18' },
    ]);
  });

  it('is unaffected by key order', () => {
    // A path diff rather than a text diff, so a reformat is not a change.
    const entries = diffJson({ a: 1, b: 2 }, { b: 2, a: 1 });

    expect(entries.every((entry) => entry.kind === 'unchanged')).toBe(true);
  });

  it('distinguishes added from removed', () => {
    const entries = diffJson({ kept: 1, gone: 2 }, { kept: 1, fresh: 3 });

    expect(entries.find((entry) => entry.path === 'fresh')?.kind).toBe('added');
    expect(entries.find((entry) => entry.path === 'gone')?.kind).toBe('removed');
  });

  it('indexes into arrays', () => {
    const entries = diffJson({ tiers: [{ dishCap: 4 }] }, { tiers: [{ dishCap: 6 }] });

    expect(entries[0]?.path).toBe('tiers.0.dishCap');
  });

  it('renders null rather than skipping it', () => {
    // Four of the nine balancing events are null, and "unauthored" is exactly
    // the fact the Studio's authoring prompt keys off — dropping it would hide
    // the work that still needs doing.
    const entries = diffJson({ vipGuest: null }, { vipGuest: { weight: 3 } });

    expect(entries.find((entry) => entry.path === 'vipGuest')?.before).toBe('null');
  });

  it('counts each kind for the summary', () => {
    const entries = diffJson({ a: 1, b: 2, same: 0 }, { a: 9, c: 3, same: 0 });

    expect(countChanges(entries)).toEqual({ added: 1, removed: 1, changed: 1 });
  });
});

describe('flavour profile', () => {
  it('keeps the canonical dimension order', () => {
    // Unity's FlavorAnchorTable is a positional int[10] and the catalogue
    // export is index-based, so reordering this array silently rewrites every
    // anchor. Pinned exactly rather than by length.
    expect(FLAVOR_DIMENSIONS).toEqual([
      'Salt',
      'Sweet',
      'Sour',
      'Bitter',
      'Umami',
      'Heat',
      'Fat',
      'Smoke',
      'Herb',
      'Acid',
    ]);
  });

  it('serialises positionally in that order', () => {
    const profile = { ...emptyFlavorProfile(), Salt: 72, Acid: 30 };

    expect(toFlavorArray(profile)).toEqual([72, 0, 0, 0, 0, 0, 0, 0, 0, 30]);
  });

  it('starts a new dish at all zeroes', () => {
    expect(toFlavorArray(emptyFlavorProfile())).toEqual(Array.from({ length: 10 }, () => 0));
  });
});
