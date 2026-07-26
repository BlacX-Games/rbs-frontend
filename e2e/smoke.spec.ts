// Named import, not default: the package's `exports.types` points at a single
// CJS-flavoured `.d.ts`, so under `module: nodenext` a default import binds the
// whole namespace object and is not constructable.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.2 AA is the §5.6 contract. Tag list is explicit so a future axe-core
// bump cannot quietly widen or narrow what "green" means.
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

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

  test('applies the Tailwind pipeline', async ({ page }) => {
    await page.goto('/');

    // Proves utilities are actually compiled and served, not merely imported —
    // a broken Tailwind plugin renders an unstyled page that still passes every
    // other assertion here.
    await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(12, 11, 10)');
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
});
