import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The Live Ops proving slice — §11 steps 4, 5, and 6.
 *
 * This is the suite that answers "does the whole path actually work": URL →
 * typed search params → `AdminApi` → the client's schema parse → MSW → the
 * design system. Every assertion below fails if any link in that chain breaks.
 */

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PASSWORD = 'operator';

async function signIn(page: Page, role: string): Promise<void> {
  await page.goto('/signin');
  await page.getByLabel('Email').fill(`${role}@rbs.local`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

test.describe('Ops home', () => {
  test('renders the figures, the feed, and the anomaly strip', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops');

    await expect(page.getByRole('heading', { name: "Today's activity" })).toBeVisible();
    await expect(page.getByText('Services run')).toBeVisible();
    await expect(page.getByText('Covers served')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent services' })).toBeVisible();

    // §6.4: every aggregate carries the instant it was computed.
    await expect(page.getByText(/^As of /)).toBeVisible();
  });

  test('formats money exactly, from an unpadded wire value', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops');

    // The fixtures store what Prisma would send — "18", not "18.00". Anything
    // reaching the screen as a bare integer, or with a float's tail, means the
    // exact path was bypassed somewhere.
    const feed = page.getByRole('region', { name: 'Recent services' }).or(page.locator('main'));
    const money = feed.getByText(/^[−-]?\$[\d,]+\.\d{2}$/).first();

    await expect(money).toBeVisible();
  });

  test('uses a true minus on a negative figure, never a hyphen', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops');
    await expect(page.getByRole('heading', { name: 'Recent services' })).toBeVisible();

    // §5.3 pairs tabular figures with U+2212. A hyphen is narrower than a digit
    // and puts a column of negatives out of alignment with the positives.
    //
    // Asserted as an ABSENCE, deliberately. Whether the eight most recent
    // services happen to include a loss is a property of the fixture seed, so
    // `negatives > 0` would be a test that passes for a reason unrelated to the
    // thing under test — and fails the day the seed shifts. The rendering
    // itself is pinned deterministically in `test/unit/lib/money.test.ts`; what
    // can only regress HERE is a screen formatting money some other way.
    expect(await page.getByText(/\$[\d,]+\.\d{2}/).count()).toBeGreaterThan(0);
    expect(await page.getByText(/^-\$[\d,]+\.\d{2}$/).count()).toBe(0);
  });
});

test.describe('the players list', () => {
  test('is a link: filters restore from the URL alone', async ({ page }) => {
    await signIn(page, 'owner');

    // §4's whole reason for choosing this router. An operator pastes the
    // address bar into Slack and the next person sees what they saw.
    await page.goto('/ops/players?provider=device&hasRestaurants=false&sort=createdAt&order=asc');

    await expect(page.getByRole('table', { name: 'Player accounts' })).toBeVisible();
    await expect(page.getByLabel('Identity provider')).toContainText('Device');
    await expect(page.getByLabel('Restaurants', { exact: true })).toContainText('No restaurants');

    // `aria-sort` is what tells a screen-reader user which column orders the
    // table — §5.6 asks for it explicitly.
    await expect(page.getByRole('columnheader', { name: /Created/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  test('writes a filter into the URL as the operator types', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops/players');

    await page.getByLabel('Search').fill('demo');
    await expect(page).toHaveURL(/q=demo/);

    // The seeded demo player, found through the real query path.
    await expect(page.getByRole('cell', { name: 'demo_chef' })).toBeVisible();
  });

  test('drops a stale filter rather than failing the route', async ({ page }) => {
    await signIn(page, 'owner');

    // A bookmark that predates a filter being renamed. `.catch(undefined)` on
    // every field means it degrades to an unfiltered list, not an error page.
    await page.goto('/ops/players?provider=carrier-pigeon&sort=nonsense');

    await expect(page.getByRole('table', { name: 'Player accounts' })).toBeVisible();
  });

  test('sorts server-side across the whole set, not just the page', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops/players?sort=restaurantCount&order=desc');

    const header = page.getByRole('columnheader', { name: /Restaurants/ });
    await expect(header).toHaveAttribute('aria-sort', 'descending');

    // Ordering the loaded page in-browser would present "the most restaurants"
    // as the most of an arbitrary fifty rows.
    const counts = await page
      .getByRole('table', { name: 'Player accounts' })
      .locator('tbody tr td:nth-child(4)')
      .allInnerTexts();

    const numbers = counts.map((value) => Number(value.trim()));
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
  });

  test('pages forward and back with a cursor', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops/players');

    const first = await page
      .getByRole('table', { name: 'Player accounts' })
      .locator('tbody tr')
      .first()
      .innerText();

    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page).toHaveURL(/cursor=/);
    const second = await page
      .getByRole('table', { name: 'Player accounts' })
      .locator('tbody tr')
      .first()
      .innerText();
    expect(second).not.toBe(first);

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByRole('table', { name: 'Player accounts' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  test('opens a peek that is itself a link, and Escape closes it', async ({ page }) => {
    await signIn(page, 'owner');

    // The peek lives in the URL because §4 wants every view linkable.
    await page.goto('/ops/players?peek=00000000-0000-7000-a000-000000000001');

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('demo_chef');

    // Email is absent from the peek ON PURPOSE — golden rule 6 puts it on the
    // detail screen only, and a drawer is what gets left open on a shared screen.
    await expect(drawer.getByText('@example.com')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(page).not.toHaveURL(/peek=/);
  });
});

test.describe('player email, the only plaintext PII (golden rule 6)', () => {
  test('is masked by default even for a role that may see it', async ({ page }) => {
    await signIn(page, 'support');
    await page.goto('/ops/players?q=player');

    // Masked until revealed: a support operator screen-sharing a triage session
    // should not broadcast forty addresses to whoever is on the call.
    await expect(page.getByText('@example.com').first()).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Reveal email/ }).first()).toBeVisible();

    await page
      .getByRole('button', { name: /Reveal email/ })
      .first()
      .click();
    await expect(page.getByText('@example.com').first()).toBeVisible();
  });

  test('is not shown at all to a role without gdpr.act', async ({ page }) => {
    await signIn(page, 'analyst');
    await page.goto('/ops/players?q=player');

    await expect(page.getByRole('table', { name: 'Player accounts' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reveal email/ })).toHaveCount(0);
    await expect(page.getByText('@example.com')).toHaveCount(0);
  });

  test('does not leak through the CSV export', async ({ page }) => {
    await signIn(page, 'analyst');
    await page.goto('/ops/players?q=player');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();

    // The export must not become a route around the role gate.
    const stream = await (await download).createReadStream();
    const csv = (await stream.toArray()).join('');

    expect(csv).not.toContain('@example.com');
    expect(csv).toContain('Hidden');
  });
});

test.describe('player detail', () => {
  test('shows the identity panel and never a subject hash', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops/players/00000000-0000-7000-a000-000000000001');

    await expect(page.getByRole('heading', { name: 'demo_chef' })).toBeVisible();
    await expect(page.getByText('Linked sign-in methods')).toBeVisible();

    // Absent from the wire type by construction — a hash of an identity is
    // still an identifier.
    expect(await page.content()).not.toContain('subjectHash');
  });

  test('renders the write actions disabled, and says why', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops/players/00000000-0000-7000-a000-000000000001');

    // Hiding them would let an operator conclude the console cannot do it.
    // Golden rule 7: no mutation without an audit row, and that needs Phase 5.
    await expect(page.getByRole('button', { name: 'Delete account' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export account' })).toBeDisabled();
    await expect(page.getByText(/arrive with Phase 5/)).toBeVisible();
  });

  test('returns to the list', async ({ page }) => {
    await signIn(page, 'owner');
    await page.goto('/ops/players/00000000-0000-7000-a000-000000000001');

    await page.getByRole('link', { name: 'Back to players' }).click();
    await expect(page.getByRole('table', { name: 'Player accounts' })).toBeVisible();
  });
});

test.describe('accessibility', () => {
  for (const colorScheme of ['dark', 'light'] as const) {
    for (const path of [
      '/ops',
      '/ops/players',
      '/ops/players/00000000-0000-7000-a000-000000000001',
    ]) {
      test(`has no violations on ${path} in the ${colorScheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await signIn(page, 'owner');
        await page.goto(path);
        await expect(page.locator('main')).not.toBeEmpty();

        const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

        expect(results.violations).toEqual([]);
      });
    }
  }
});
