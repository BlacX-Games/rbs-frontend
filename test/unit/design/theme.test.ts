import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DENSITY,
  readStoredDensity,
  readStoredTheme,
  resolveTheme,
  type Density,
  type ResolvedTheme,
} from '@/design/theme';
import { readTokensCss } from '../../support/tokens';

/**
 * The pre-paint script in `index.html`, tested against the module it duplicates.
 *
 * The duplication is unavoidable — the attributes must be stamped before first
 * paint, which cannot wait for the module graph — so the risk is drift, not
 * duplication. Rather than compare source strings, this suite RUNS the real
 * script out of `index.html` and asserts it lands on the same answer as
 * `src/design/theme.ts` for every combination of stored preference and OS
 * setting. An edit to either that changes behaviour fails here.
 */

/** The inline block; the `<script type="module" src=…>` tag has attributes. */
function prePaintScriptSource(): string {
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
  const match = /<script>([\s\S]*?)<\/script>/.exec(html);

  if (!match?.[1]) throw new Error('index.html no longer contains an inline pre-paint script');

  return match[1];
}

const SCRIPT_SOURCE = prePaintScriptSource();

/**
 * Executes the real script text against the ambient jsdom document.
 *
 * `new Function` is the point, not a shortcut: re-implementing the script in
 * TypeScript would test a copy and prove nothing about the one the browser
 * runs. The input is a file in this repository, not user data.
 */
function runPrePaintScript(): void {
  /* eslint-disable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call */
  new Function(SCRIPT_SOURCE)();
  /* eslint-enable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call */
}

function stubOsPrefersLight(prefersLight: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('light') ? prefersLight : !prefersLight,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function stampedTheme(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

function stampedDensity(): string | null {
  return document.documentElement.getAttribute('data-density');
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('pre-paint theme resolution', () => {
  const CASES = [
    { stored: null, osPrefersLight: false, expected: 'dark', why: 'no preference, OS dark' },
    { stored: null, osPrefersLight: true, expected: 'light', why: 'no preference, OS light' },
    { stored: 'system', osPrefersLight: true, expected: 'light', why: 'system follows the OS' },
    { stored: 'system', osPrefersLight: false, expected: 'dark', why: 'system follows the OS' },
    { stored: 'dark', osPrefersLight: true, expected: 'dark', why: 'explicit dark beats OS light' },
    {
      stored: 'light',
      osPrefersLight: false,
      expected: 'light',
      why: 'explicit light beats OS dark',
    },
    {
      stored: 'nonsense',
      osPrefersLight: true,
      expected: 'light',
      why: 'junk falls back to system',
    },
  ] as const;

  it.each(CASES)('$why → $expected', ({ stored, osPrefersLight, expected }) => {
    if (stored !== null) localStorage.setItem('rbs.theme', stored);
    stubOsPrefersLight(osPrefersLight);

    runPrePaintScript();
    expect(stampedTheme(), 'inline script').toBe(expected);

    // The whole point: the module must agree, or the page corrects itself
    // visibly after hydration.
    expect(resolveTheme(readStoredTheme()), 'theme.ts').toBe(expected satisfies ResolvedTheme);
  });

  it('honours the OS preference even when storage throws', () => {
    // Safari private mode, or an operator who has blocked site data. The script
    // guards only the reads, so a storage failure must not cost the OS
    // preference — that is what keeps it in step with theme.ts.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    stubOsPrefersLight(true);

    runPrePaintScript();

    expect(stampedTheme()).toBe('light');
    expect(resolveTheme(readStoredTheme())).toBe('light');
  });

  it('falls back to dark when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    runPrePaintScript();

    expect(stampedTheme()).toBe('dark');
    expect(resolveTheme(readStoredTheme())).toBe('dark');
  });
});

describe('pre-paint density resolution', () => {
  const CASES = [
    { stored: null, expected: 'comfortable' },
    { stored: 'comfortable', expected: 'comfortable' },
    { stored: 'compact', expected: 'compact' },
    { stored: 'nonsense', expected: 'comfortable' },
  ] as const;

  it.each(CASES)('stored $stored → $expected', ({ stored, expected }) => {
    if (stored !== null) localStorage.setItem('rbs.density', stored);
    stubOsPrefersLight(false);

    runPrePaintScript();

    expect(stampedDensity(), 'inline script').toBe(expected);
    expect(readStoredDensity(), 'theme.ts').toBe(expected satisfies Density);
  });

  it('defaults to the accessible density — 44px is the GDD tap-target floor', () => {
    expect(DEFAULT_DENSITY).toBe('comfortable');
  });
});

describe('tokens.css and theme.ts agree on the OS query', () => {
  it('both invert to prefers-color-scheme: light, because dark is the default', () => {
    // Comment-stripped: the tokens.css header quotes the REJECTED `dark` query
    // while explaining why it was rejected, and a raw read matches the prose.
    const tokensCss = readTokensCss();

    // If one side ever flips to `dark`, cold loads flash the wrong theme on
    // exactly the machines whose OS disagrees with the default.
    expect(tokensCss).toContain('@media (prefers-color-scheme: light)');
    expect(tokensCss).not.toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
    expect(SCRIPT_SOURCE).toContain('(prefers-color-scheme: light)');
  });
});
