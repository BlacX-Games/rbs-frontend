// Named import, not default: the package's `exports.types` points at a single
// CJS-flavoured `.d.ts`, so under `module: nodenext` a default import binds the
// whole namespace object and is not constructable.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.2 AA is the §5.6 contract. Tag list is explicit so a future axe-core
// bump cannot quietly widen or narrow what "green" means.
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The two --bg-canvas values from §5.2, as the browser reports them.
const DARK_CANVAS = 'rgb(12, 11, 10)';
const PAPER_CANVAS = 'rgb(245, 239, 224)';

/**
 * ── Where these tests point, after Phase 2 stage 3 ──────────────────────────
 * `/` was the design gallery through Phase 1. It is now a redirect to
 * `/insights`, which sits behind the auth wall — so a cold visit lands on
 * `/signin`, and that is what "boots" means for an operator now.
 *
 * The theme and density mechanics moved to `/design`, because that is where the
 * toggles live outside the shell. Sign-in deliberately carries neither: it is
 * the one screen shown before we know who is looking, and a preference control
 * there would be the first thing an operator saw.
 */

test.describe('operator console shell', () => {
  test('boots clean, and a cold visit lands on sign-in', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('/');

    // Four things at once, which is why it is the first test: the router
    // mounted, `/` redirected, the auth guard ran, and the mock network was
    // already intercepting when the guard called `/auth/refresh`.
    await expect(page).toHaveURL(/\/signin/);
    await expect(page).toHaveTitle(/Operator Console/);
    await expect(page.getByRole('heading', { level: 1, name: 'Operator Console' })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('applies the Tailwind pipeline through the design tokens', async ({ page }) => {
    // Proves utilities are compiled and served, not merely imported — a broken
    // Tailwind plugin renders an unstyled page that still passes every other
    // assertion here.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/signin');

    await expect(page.locator('main')).toHaveCSS('background-color', DARK_CANVAS);
  });

  test('self-hosts the faces — no third-party font request', async ({ page }) => {
    const thirdParty: string[] = [];
    const served = new Map<string, number>();

    page.on('request', (request) => {
      const { hostname } = new URL(request.url());
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        thirdParty.push(request.url());
      }
    });
    page.on('response', (response) =>
      served.set(new URL(response.url()).pathname, response.status()),
    );

    await page.goto('/signin');

    // §5.3: no CDN. A font request to a third party leaks, in the referrer
    // alone, which console an operator is using — which the GDD's
    // privacy-first stance rules out.
    expect(thirdParty).toEqual([]);

    for (const face of ['inter-latin-variable', 'fraunces-latin-variable']) {
      expect(served.get(`/fonts/${face}.woff2`), face).toBe(200);
    }

    await expect(page.locator('h1')).toHaveCSS('font-family', /Fraunces/);
  });

  test('renders a real 404 for a URL that is not a screen', async ({ page }) => {
    await page.goto('/ops/nothing-here');

    // Outside the shell on purpose: a 404 framed by the rail reads as "this
    // screen exists and is empty".
    await expect(page.getByText('No such screen')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  });
});

test.describe('theme mechanics (§5.2)', () => {
  test('follows the OS preference when the operator has expressed none', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/design');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('main')).toHaveCSS('background-color', PAPER_CANVAS);

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('main')).toHaveCSS('background-color', DARK_CANVAS);
  });

  test('lets an explicit choice beat the OS in both directions', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/design');

    await page.getByRole('radio', { name: 'Paper' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Survives a reload: the preference is stored, not merely applied.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // …and the other direction, against an OS that now asks for light.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.getByRole('radio', { name: 'Dark' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('applies the stored theme before first paint', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/design');
    await page.getByRole('radio', { name: 'Dark' }).click();

    // The pre-paint script's whole reason to exist: on a cold load the stored
    // theme must already be on <html> when the document commits, not applied
    // afterwards by React. `waitUntil: 'commit'` returns before the module
    // graph has run, so only the inline script can have set this.
    await page.goto('/design', { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switches density and persists the choice', async ({ page }) => {
    await page.goto('/design');

    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable');
    await page.getByRole('radio', { name: 'Compact' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');

    // What the density MEASURES is asserted in design.matrix.spec.ts, which
    // walks every row of a real DataTable in all four theme × density
    // combinations. Phase 1 duplicated a weaker version of that here only
    // because App.tsx carried its own two-row table; App.tsx is gone, and one
    // measured 44px floor beats a second, shallower one.
  });
});

test.describe('accessibility', () => {
  for (const colorScheme of ['dark', 'light'] as const) {
    for (const path of ['/signin', '/design']) {
      test(`has no violations on ${path} in the ${colorScheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);

        const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

        expect(results.violations).toEqual([]);
      });
    }
  }
});
