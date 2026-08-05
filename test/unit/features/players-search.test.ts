import { describe, expect, it } from 'vitest';
import {
  PlayersSearchSchema,
  activeFilterCount,
  toPlayerQuery,
} from '@/features/ops/players-search';

/**
 * The `/ops/players` URL contract.
 *
 * A URL is user input — an operator edits it, a link rots, a bookmark predates
 * a rename — so the interesting cases are all the malformed ones.
 */

describe('parsing the URL', () => {
  it('accepts an empty search as an unfiltered list', () => {
    expect(PlayersSearchSchema.parse({})).toEqual({});
  });

  it('parses a full filtered view', () => {
    const parsed = PlayersSearchSchema.parse({
      q: 'demo',
      provider: 'device',
      ageBracket: 'age16plus',
      activeWithinDays: 30,
      hasRestaurants: true,
      sort: 'lastActive',
      order: 'asc',
      cursor: 'MjA=',
      peek: 'some-id',
    });

    expect(parsed.q).toBe('demo');
    expect(parsed.activeWithinDays).toBe(30);
    expect(parsed.hasRestaurants).toBe(true);
  });

  it('DROPS a malformed value rather than failing the route', () => {
    // A stale bookmark should show an unfiltered list, not an error page. This
    // is what `.catch(undefined)` on every field buys.
    const parsed = PlayersSearchSchema.parse({
      provider: 'carrier-pigeon',
      ageBracket: 'toddler',
      activeWithinDays: 4000,
      sort: 'nonsense',
      order: 'sideways',
      q: '',
      cursor: '',
    });

    expect(parsed).toEqual({
      provider: undefined,
      ageBracket: undefined,
      activeWithinDays: undefined,
      sort: undefined,
      order: undefined,
      q: undefined,
      cursor: undefined,
      peek: undefined,
      hasRestaurants: undefined,
    });
  });

  it('rejects an activity window it does not offer', () => {
    // The three §6.1 windows and nothing else — an arbitrary number would reach
    // the server as a filter nobody designed a control for.
    expect(PlayersSearchSchema.parse({ activeWithinDays: 45 }).activeWithinDays).toBeUndefined();
    expect(PlayersSearchSchema.parse({ activeWithinDays: 90 }).activeWithinDays).toBe(90);
  });
});

describe('toPlayerQuery', () => {
  it('omits an unset filter entirely rather than sending undefined', () => {
    // `?q=` and `?q=undefined` are both how a cleared filter starts matching
    // nothing instead of everything.
    expect(toPlayerQuery({})).toEqual({});
  });

  it('leaves the peek out of the query', () => {
    // Which row is open in a drawer is a view concern. Including it would make
    // the drawer part of the cache key, so opening one would refetch the list.
    const query = toPlayerQuery({ peek: 'some-id', q: 'demo' });

    expect(query).toEqual({ q: 'demo' });
    expect('peek' in query).toBe(false);
  });

  it('carries every filter the server understands', () => {
    expect(
      toPlayerQuery({
        q: 'demo',
        provider: 'google',
        ageBracket: 'under13',
        activeWithinDays: 7,
        hasRestaurants: false,
        sort: 'createdAt',
        order: 'desc',
        cursor: 'MjA=',
      }),
    ).toEqual({
      q: 'demo',
      provider: 'google',
      ageBracket: 'under13',
      activeWithinDays: 7,
      hasRestaurants: false,
      sort: 'createdAt',
      order: 'desc',
      cursor: 'MjA=',
    });
  });

  it('keeps a false filter, which is not the same as an absent one', () => {
    // `hasRestaurants: false` means "only players with none" — a real filter.
    // A falsy check here would silently turn it into "any".
    expect(toPlayerQuery({ hasRestaurants: false })).toEqual({ hasRestaurants: false });
  });
});

describe('activeFilterCount', () => {
  it('counts filters, and not sort or paging', () => {
    // The clear button exists to undo FILTERING. Counting the sort would offer
    // to clear something the button does not touch.
    expect(activeFilterCount({ sort: 'createdAt', order: 'asc', cursor: 'MjA=' })).toBe(0);
    expect(activeFilterCount({ q: 'demo', provider: 'device' })).toBe(2);
    expect(activeFilterCount({ hasRestaurants: false })).toBe(1);
  });
});
