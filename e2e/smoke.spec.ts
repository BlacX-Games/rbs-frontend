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

test.describe('operator console shell', () => {
  test('boots clean', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('/');

    await expect(page).toHaveTitle(/Operator Console/);
    await expect(page.getByRole('heading', { level: 1, name: 'Operator Console' })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('applies the Tailwind pipeline through the design tokens', async ({ page }) => {
    // Proves utilities are compiled and served, not merely imported — a broken
    // Tailwind plugin renders an unstyled page that still passes every other
    // assertion here. Phase 0 asserted a literal hex against the default theme;
    // now the value has to arrive through `bg-canvas` → `var(--bg-canvas)` →
    // tokens.css, and the theme it resolves under is stated rather than assumed.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

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

    await page.goto('/');

    // §5.3: no CDN. A font request to a third party leaks, in the referrer
    // alone, which console an operator is using — which the GDD's
    // privacy-first stance rules out.
    expect(thirdParty).toEqual([]);

    // Both preloaded faces actually arrive. Asserting the computed
    // `font-family` alone would pass even if every .woff2 404'd, because the
    // cascade falls through to the local fallback stack silently.
    for (const face of ['inter-latin-variable', 'fraunces-latin-variable']) {
      expect(served.get(`/fonts/${face}.woff2`), face).toBe(200);
    }

    await expect(page.locator('h1')).toHaveCSS('font-family', /Fraunces/);
  });
});

test.describe('theme mechanics (§5.2)', () => {
  test('follows the OS preference when the operator has expressed none', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('main')).toHaveCSS('background-color', PAPER_CANVAS);

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('main')).toHaveCSS('background-color', DARK_CANVAS);
  });

  test('lets an explicit choice beat the OS in both directions', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

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
    await page.goto('/');
    await page.getByRole('radio', { name: 'Dark' }).click();

    // The pre-paint script's whole reason to exist: on a cold load the stored
    // theme must already be on <html> when the document commits, not applied
    // afterwards by React. `waitUntil: 'commit'` returns before the module
    // graph has run, so only the inline script can have set this.
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switches density, and comfortable meets the 44px tap-target floor', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable');
    const comfortable = await page.locator('tbody tr').first().boundingBox();
    expect(comfortable?.height).toBeGreaterThanOrEqual(44);

    await page.getByRole('radio', { name: 'Compact' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
    const compact = await page.locator('tbody tr').first().boundingBox();
    expect(compact?.height).toBeLessThan(comfortable?.height ?? Number.POSITIVE_INFINITY);
  });
});

test.describe('accessibility', () => {
  for (const colorScheme of ['dark', 'light'] as const) {
    test(`has no violations in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/');

      const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
