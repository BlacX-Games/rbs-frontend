import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

// Pure (no DOM, no network): pins the contract of the only configuration seam
// the dashboard has. A silently-wrong base URL is the single cheapest way to
// waste an afternoon, so it fails at parse time instead.
describe('parseEnv', () => {
  it('defaults to same-origin and mock data', () => {
    expect(parseEnv({})).toEqual({ apiBaseUrl: '', useMocks: true });
  });

  it('reads an absolute base URL and turns mocks off', () => {
    expect(
      parseEnv({ VITE_API_BASE_URL: 'https://api.example.com', VITE_USE_MOCKS: 'false' }),
    ).toEqual({ apiBaseUrl: 'https://api.example.com', useMocks: false });
  });

  it('ignores vars it does not own, including the dev-only proxy target', () => {
    expect(
      parseEnv({ VITE_DEV_PROXY_TARGET: 'http://localhost:3000', MODE: 'test', DEV: true }),
    ).toEqual({ apiBaseUrl: '', useMocks: true });
  });

  it('rejects a trailing slash on the base URL, naming the key', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: 'https://api.example.com/' })).toThrow(
      /VITE_API_BASE_URL: must not end with a trailing slash/,
    );
  });

  it('rejects a mock flag that is not the literal true or false', () => {
    expect(() => parseEnv({ VITE_USE_MOCKS: 'yes' })).toThrow(/VITE_USE_MOCKS/);
  });
});
