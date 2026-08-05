import { expect, test } from '@playwright/test';

/**
 * Visual regression over the design gallery — Phase 1's last deliverable
 * ("snapshots baselined", §9).
 *
 * ── Why per SECTION rather than one full-page shot ────────────────────────────
 * The gallery is roughly twenty thousand pixels tall. A single image means any
 * one-pixel change anywhere fails the whole thing and produces a diff nobody
 * can read. Seventeen section-sized images give failure LOCALITY: a broken
 * Button fails "Actions" and says so.
 *
 * ── Why both themes but only one density ──────────────────────────────────────
 * §10 asks for "both themes", and the two themes are genuinely different
 * renderings — different surfaces, two golds, inverted elevation. Density is
 * different in kind: what changes is every control's HEIGHT, and
 * `design.matrix.spec.ts` already measures that with `boundingBox()` in all
 * four combinations. A measured 44px floor is a stronger assertion than a
 * picture of one, so snapshotting density too would double the baselines to
 * re-assert something already proven better elsewhere.
 *
 * ── What these can and cannot catch ───────────────────────────────────────────
 * They catch unintended visual change — a token edit that ripples somewhere
 * nobody expected, a layout that reflows when a component gains a prop. They do
 * NOT judge whether the result is good. Approving a diff is a design decision,
 * so a failure here means "look at this", never "revert this".
 */

/** Every `<Section>` heading in the gallery, in document order. */
const SECTIONS = [
  'Typography',
  'Surfaces',
  'Gold — brand, accent, focus. Never status.',
  'Categorical series — 8 slots, fixed order',
  'Polarity — the diverging scale that replaced amber',
  'Progression tiers — ordinal, one hue, monotone lightness',
  'Density',
  'Actions',
  'Fields',
  'Choice',
  'Display',
  'Overlays',
  'Navigation',
  'Search & dates',
  'Charts',
  'Readouts',
  'Data',
] as const;

/** Filename-safe, and stable across a heading's punctuation. */
function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`the ${colorScheme} gallery`, () => {
    test.beforeEach(async ({ page }) => {
      /*
       * Reduced motion, always.
       *
       * Not a nicety — `toHaveScreenshot` waits for an element to hold the same
       * pixels across consecutive frames, and anything still moving never
       * settles. The Charts section timed out on exactly that before this line
       * existed. tokens.css collapses every duration to 1ms and pins
       * animation-iteration-count to 1 under this media query, which stops
       * `animate-pulse` and every transition at a defined end state.
       *
       * Motion is not what these snapshots test — the reduced-motion contract
       * itself is asserted in design.matrix.spec.ts against a computed style.
       */
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/');

      // The three faces are self-hosted and arrive after first paint. Without
      // this the first run snapshots a fallback face and every later run
      // "regresses" to Fraunces.
      //
      // A string expression rather than a callback: `e2e/` builds under
      // tsconfig.node.json, which deliberately ships no DOM lib — admitting one
      // so this could say `document.fonts` would also let `document`
      // type-check inside vite.config.ts. `.then(() => true)` keeps the
      // resolved value serialisable, since a FontFaceSet is not.
      await page.evaluate('document.fonts.ready.then(() => true)');

      // The charts measure their own width through ParentSize, which settles a
      // frame after mount. Waiting on a rendered mark is what makes the Charts
      // section deterministic rather than occasionally blank.
      await expect(page.locator('svg').first()).toBeVisible();
    });

    for (const title of SECTIONS) {
      test(`${slugOf(title)} is unchanged`, async ({ page }) => {
        const section = page
          .locator('section')
          .filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) });

        // Scrolled into view first so the charts inside it — which size
        // themselves from their measured parent — have laid out before the
        // stability check starts counting.
        await section.scrollIntoViewIfNeeded();

        /*
         * Headroom over the 5s default, nothing more.
         *
         * `toHaveScreenshot` waits for two consecutive frames with identical
         * pixels, and the tall sections hold several charts that settle a frame
         * apart; under a fully parallel suite that can outlast 5s. The
         * stability failure this file actually hit was fixed by the
         * reduced-motion emulation above, not by this number — and the pixel
         * difference after that turned out to be a real component defect
         * (RadarChart's geometry depending on measured width), fixed at source.
         *
         * This is patience, not tolerance: the comparison is unchanged.
         */
        await expect(section).toHaveScreenshot(`${slugOf(title)}-${colorScheme}.png`, {
          timeout: 20_000,
        });
      });
    }
  });
}
