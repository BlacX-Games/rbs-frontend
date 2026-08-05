import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The shell, the auth wall, and the role matrix — §11 step 2, as a test.
 *
 * The plan asks a reviewer to "sign in as each of the five roles; confirm nav
 * gating and `ForbiddenState` on direct URL access to a forbidden route". That
 * is a checklist a human runs once and never again. This is the same walk, in
 * CI, on every commit.
 *
 * Everything here runs against the MSW mock network, which enforces the same
 * role matrix the client does — so a gating bug shows up as a 403 the screen
 * has to handle, not as a mock that answers anything asked of it.
 */

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Must match MOCK_PASSWORD in src/mocks/fixtures.ts. */
const PASSWORD = 'operator';

/**
 * Signs in and waits for the shell to actually be on screen.
 *
 * The wait is not politeness. `locator.all()` and `keyboard.press()` do NOT
 * auto-wait the way `expect(locator)` does, so a caller that walks the rail
 * immediately after clicking "Sign in" reads zero links, and one that presses
 * ⌘K sends it at a page mid-navigation. Both fail as "the feature is broken"
 * rather than as "the test was early".
 *
 * `settle: false` for the cases that expect sign-in to be REFUSED — a wrong
 * password, or a player account — where no shell will ever appear.
 */
async function signIn(page: Page, role: string, settle = true): Promise<void> {
  await page.goto('/signin');
  await page.getByLabel('Email').fill(`${role}@rbs.local`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  if (settle) await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

test.describe('sign-in', () => {
  test('signs in and lands on Insights', async ({ page }) => {
    await signIn(page, 'owner');

    // Anchored. An unanchored /\/insights/ also matches
    // `/signin?redirect=%2Finsights`, so it passes for an operator who was
    // bounced straight back out — which is how this suite briefly reported a
    // working session restore that was not working at all.
    await expect(page).toHaveURL(/\/insights$/);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  test('returns the operator to where they were going', async ({ page }) => {
    // The whole reason `_console` puts `location.href` in the redirect: an
    // operator who followed a link to a filtered list must land on that
    // filtered list, not on its unfiltered default.
    await page.goto('/ops/sessions?from=2026-07-01');
    await expect(page).toHaveURL(/\/signin/);

    await page.getByLabel('Email').fill('owner@rbs.local');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/ops\/sessions\?from=2026-07-01/);
  });

  test('refuses a wrong password without saying which half was wrong', async ({ page }) => {
    await page.goto('/signin');
    await page.getByLabel('Email').fill('owner@rbs.local');
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText('do not match');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('refuses a player account, which has credentials but no console access', async ({
    page,
  }) => {
    await signIn(page, 'player', false);

    // Signing them in and then bouncing them off every screen would be
    // technically correct and useless.
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/signin/);
  });

  test('reveals the password on request, and says so to a screen reader', async ({ page }) => {
    await page.goto('/signin');

    const field = page.getByLabel('Password', { exact: true });
    await field.fill('operator');
    await expect(field).toHaveAttribute('type', 'password');

    // WCAG 2.2 SC 3.3.8. `aria-pressed` states the CURRENT condition; a label
    // that only names the next action never says the password is visible.
    const toggle = page.getByRole('button', { name: 'Show password' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(field).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('survives a reload without asking again', async ({ page }) => {
    await signIn(page, 'admin');
    await expect(page).toHaveURL(/\/insights$/);

    // The access token died with the page — it lives in a module variable, by
    // design. The refresh cookie did not, and `_console.beforeLoad` restores
    // from it before concluding nobody is signed in.
    await page.reload();

    await expect(page).toHaveURL(/\/insights$/);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  test('signs out and cannot get back in with the back button', async ({ page }) => {
    await signIn(page, 'owner');
    await page.getByRole('button', { name: /Owner Operator/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/signin/);

    await page.goBack();
    await expect(page).toHaveURL(/\/signin/);
  });
});

test.describe('the role matrix (§8.2)', () => {
  /**
   * One row per role: what the rail offers, and one route that must refuse.
   *
   * `forbidden` is checked by typing the URL, not by looking for a missing
   * link — §7.4 is explicit that a hidden rail entry is not a permission check,
   * and the route must render `ForbiddenState` rather than 404 or redirect.
   */
  const ALL_GROUPS = ['Insights', 'Live Ops', 'Catalog', 'Balancing', 'System'];

  const CASES: readonly {
    role: string;
    groups: readonly string[];
    forbidden: string | null;
  }[] = [
    { role: 'owner', groups: ALL_GROUPS, forbidden: null },
    // Admin DOES see System: `/system/audit` and `/system/settings` are
    // `ops.read`, and only `/system/admins` needs `admin.manage`. The group
    // survives because two of its three entries do — which is the behaviour
    // worth pinning, since the naive reading is that losing one capability
    // hides the whole group.
    { role: 'admin', groups: ALL_GROUPS, forbidden: '/system/admins' },
    { role: 'support', groups: ['Insights', 'Live Ops', 'System'], forbidden: '/catalog/dishes' },
    { role: 'analyst', groups: ['Insights', 'Live Ops', 'System'], forbidden: '/balancing/tiers' },
  ];

  for (const { role, groups, forbidden } of CASES) {
    test(`${role} sees only its groups`, async ({ page }) => {
      await signIn(page, role);

      const rail = page.getByRole('navigation', { name: 'Main' });

      for (const group of ALL_GROUPS) {
        const heading = rail.getByText(group, { exact: true });

        if (groups.includes(group)) {
          await expect(heading, `${role} should see ${group}`).toBeVisible();
        } else {
          // A group whose every entry is gated away disappears with it —
          // otherwise an analyst reads a Balancing heading with nothing under
          // it and concludes the console is broken.
          await expect(heading, `${role} should not see ${group}`).toBeHidden();
        }
      }
    });

    if (forbidden !== null) {
      test(`${role} gets an explanation, not a blank page, at ${forbidden}`, async ({ page }) => {
        await signIn(page, role);
        await page.goto(forbidden);

        await expect(page.getByText('You do not have access to this')).toBeVisible();
        // Still inside the shell: they can navigate away without the back button.
        await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      });
    }
  }

  test('offers the palette only what the role may reach', async ({ page }) => {
    await signIn(page, 'analyst');
    await page.keyboard.press('ControlOrMeta+k');

    const palette = page.getByRole('dialog', { name: 'Search and commands' });
    await expect(palette).toBeVisible();

    await palette.getByRole('combobox').fill('tiers');

    // Balancing is `balancing.publish`, which an analyst does not hold. A
    // palette that offered it would send them to a ForbiddenState they had no
    // way to anticipate.
    await expect(palette.getByText('Nothing matches that.')).toBeVisible();
  });
});

test.describe('the shell', () => {
  test('reaches every rail entry without a 404 or a crash', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));

    await signIn(page, 'owner');

    const rail = page.getByRole('navigation', { name: 'Main' });
    const links = rail.getByRole('link');

    // Phase 2's deliverable in one assertion: every §4 route exists and renders
    // something — real data or a placeholder naming the phase that builds it.
    const total = await links.count();
    expect(total).toBeGreaterThan(30);

    /*
     * CLICKED, not `page.goto`.
     *
     * Two reasons, and the second is why this test was flaky. A click is a
     * client-side navigation, which is what an operator actually does — `goto`
     * is a full reload that re-registers the service worker and re-runs the
     * auth restore, so it exercises the cold-boot path thirty-five times and
     * tests the router not at all. It is also roughly thirty times slower, which
     * pushed this past the default timeout whenever the suite ran four-wide.
     */
    for (let index = 0; index < total; index += 1) {
      // Re-queried each iteration: navigating re-renders the rail's active
      // state, which invalidates a handle captured before the click.
      const link = links.nth(index);
      const label = await link.innerText();

      await link.click();

      await expect(page.getByText('No such screen'), label).toBeHidden();
      await expect(rail, label).toBeVisible();
      // Something rendered — a real screen or a placeholder naming its phase.
      await expect(page.locator('main'), label).not.toBeEmpty();
    }

    expect(problems).toEqual([]);
  });

  test('names the phase on a screen that is not built yet', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/catalog/dishes');

    // A blank page cannot be told apart from a broken one.
    await expect(page.getByText('Not built yet')).toBeVisible();
    await expect(page.getByText(/Phase 6 — Content Catalog/)).toBeVisible();
  });

  test('says when a screen is blocked on the backend rather than on us', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/insights/ai-cost');

    // §6.4: a panel whose backing table does not exist says so, and never
    // renders a zero.
    await expect(page.getByText(/no telemetry or AI-cost table/)).toBeVisible();
  });

  test('collapses the rail and remembers it', async ({ page }) => {
    await signIn(page, 'owner');

    await page.getByRole('button', { name: 'Collapse navigation' }).click();
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
  });

  test('keeps the access token out of web storage', async ({ page }) => {
    await signIn(page, 'owner');

    // §11 step 6. The token lives in a module variable that only this bundle
    // can reach; anything in web storage is readable by any injected script.
    const stored = await page.evaluate(
      'JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })',
    );

    expect(stored).not.toContain('mock.');
    expect(stored).not.toContain('accessToken');
  });

  for (const colorScheme of ['dark', 'light'] as const) {
    test(`has no axe violations in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await signIn(page, 'owner');
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
