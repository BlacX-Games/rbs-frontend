// Named import, not default — see the note in smoke.spec.ts.
import { AxeBuilder } from '@axe-core/playwright';
// Explicit .js extension: e2e builds under `moduleResolution: nodenext`.
import { expect, test } from './fixtures.js';

/**
 * The design system across theme × density, in a real browser.
 *
 * This file exists because two of the §5.6 contract's clauses are unobservable
 * everywhere else:
 *
 *   • The 44×44 target floor. Vitest runs with `css: false`, so jsdom loads no
 *     stylesheet and every measured height is `''`. And axe will not cover it
 *     either — WCAG 2.2 SC 2.5.8 sets the AA floor at 24×24, while 44×44 is
 *     SC 2.5.5, which is AAA. A 32px control passes axe and fails §5.6, which
 *     is exactly the state ThemeControls shipped in until stage 2a.
 *
 *   • Reduced motion and forced colours, which need a real engine.
 *
 * Four projects run this file; `density` comes from the project fixture.
 */

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Every interactive role stage 2a puts on the page, and which element is the
 * actual TARGET.
 *
 * Sliders are the one exception, and a real one rather than a concession. The
 * element carrying `role="slider"` is the THUMB, which is deliberately a
 * restrained 16px — but Radix moves the nearest thumb when the track is
 * clicked, so the region that accepts the pointer is the track row, and the
 * row is what `min-h-(--control-h)` sizes. SC 2.5.5 measures the target, not
 * the ink; sizing the thumb itself to 44px would look absurd and measure the
 * wrong thing.
 */
const CONTROL_ROLES = [
  { role: 'button', target: 'self' },
  { role: 'checkbox', target: 'self' },
  { role: 'radio', target: 'self' },
  { role: 'switch', target: 'self' },
  { role: 'combobox', target: 'self' },
  { role: 'textbox', target: 'self' },
  { role: 'spinbutton', target: 'self' },
  { role: 'slider', target: 'parent' },
] as const;

test.describe('the design system', () => {
  test('gives every control the density it was asked for', async ({ page, density }) => {
    await page.goto('/');

    const floor = density === 'comfortable' ? 44 : 32;
    const undersized: string[] = [];

    for (const { role, target } of CONTROL_ROLES) {
      for (const control of await page.getByRole(role).all()) {
        // Two levels, not one: Radix wraps each thumb in an absolutely
        // positioned span for placement, so `..` is that wrapper (thumb-sized)
        // and `../..` is the Root — the clickable track row that carries
        // min-h-(--control-h).
        const measured = target === 'parent' ? control.locator('xpath=../..') : control;
        const box = await measured.boundingBox();
        if (box === null) continue;

        // Sub-pixel rounding is real at some zoom levels; 0.5px of slack keeps
        // the assertion about design rather than about layout arithmetic.
        if (box.height < floor - 0.5) {
          const name = await control.getAttribute('aria-label');
          undersized.push(
            `${role} "${name ?? (await control.innerText())}" — ${String(box.height)}px`,
          );
        }
      }
    }

    // Collected and reported together: one failure naming all offenders beats
    // twelve runs each naming the next one.
    expect(undersized, `controls below the ${String(floor)}px floor`).toEqual([]);
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });

  test('has no axe violations with an overlay open', async ({ page }) => {
    await page.goto('/');

    // A closed overlay is unmounted, so the pass above never sees a portalled
    // surface at all — the dialog, its scrim, and its focus guards are exactly
    // the markup most likely to be wrong and least likely to be checked.
    await page.getByRole('button', { name: 'Open delete dialog' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });

  test('keeps a dialog control at the density floor', async ({ page, density }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open delete dialog' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const floor = density === 'comfortable' ? 44 : 32;

    for (const control of await dialog.getByRole('button').all()) {
      const box = await control.boundingBox();
      if (box === null) continue;

      // Portalled content inherits [data-density] from <html>, not from the
      // trigger's subtree — worth proving rather than assuming, since a portal
      // escaping the cascade would silently ship 44px controls in compact.
      expect(box.height, await control.innerText()).toBeGreaterThanOrEqual(floor - 0.5);
    }
  });

  test('offers a skip link as the first focusable element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skip = page.getByRole('link', { name: 'Skip to content' });

    // sr-only until focused, then visible — §5.6's "skip link" clause. On a
    // page this long, its absence means tabbing through every specimen.
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });
});

test.describe('motion and forced colours', () => {
  test('collapses transitions to 1ms under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // `toHaveCSS` rather than `evaluate`: it reads the real computed style
    // without needing a DOM lib in tsconfig.node.json, and it is the idiom
    // smoke.spec.ts already uses. §5.4 asserted against the browser, not a
    // class name.
    await expect(page.getByRole('button', { name: 'Publish version' }).first()).toHaveCSS(
      'transition-duration',
      '0.001s',
    );
  });

  test('survives forced-colors without axe violations', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');

    const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

    // Honest scope: this proves axe finds nothing, NOT that the console is
    // pleasant in a high-contrast theme. A real forced-colors pass needs eyes,
    // and is owed in Phase 10.
    expect(results.violations).toEqual([]);
  });
});
