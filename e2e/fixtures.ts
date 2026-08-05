import { test as base, type Page } from '@playwright/test';

/**
 * Seeds the density preference the running project asks for.
 *
 * Theme is a first-class Playwright option (`use.colorScheme`); density is
 * ours, so it travels in `project.metadata` and lands in `localStorage` via
 * `addInitScript` — which runs BEFORE the pre-paint block in `index.html`. That
 * ordering matters: these tests exercise the same cold-load path an operator
 * does, rather than toggling the control afterwards and measuring a state the
 * first paint never had.
 */

/**
 * Must match DENSITY_STORAGE_KEY in `src/design/theme.ts`.
 *
 * A literal because `e2e/` builds under tsconfig.node.json, which has no `@/*`
 * path mapping — importing from `src/` would not resolve.
 */
const DENSITY_STORAGE_KEY = 'rbs.density';

export const test = base.extend<{ density: 'comfortable' | 'compact' }>({
  // Named `provide`, not Playwright's conventional `use`: ESLint's
  // react-hooks/rules-of-hooks sees a bare `use(...)` call and reports React
  // 19's `use` hook being called outside a component. The parameter is
  // positional, so renaming costs nothing and beats a disable comment.
  density: async ({ page }, provide, testInfo) => {
    const density = testInfo.project.metadata['density'] === 'compact' ? 'compact' : 'comfortable';

    // A string script rather than a function. tsconfig.node.json deliberately
    // ships no DOM lib — admitting one so this callback could say
    // `window.localStorage` would also let `document` type-check inside
    // vite.config.ts, where it is meaningless.
    await page.addInitScript(
      `window.localStorage.setItem(${JSON.stringify(DENSITY_STORAGE_KEY)}, ${JSON.stringify(density)});`,
    );

    await provide(density);
  },
});

export { expect } from '@playwright/test';

/**
 * Waits for React to have mounted.
 *
 * Needed because the app no longer renders synchronously on `load`: `main.tsx`
 * awaits the MSW service worker before the first render, so that the router's
 * `beforeLoad` cannot fire a request the worker is not yet intercepting.
 *
 * Playwright's `expect(locator)` auto-waits and does not care. `locator.all()`,
 * `locator.count()`, and `keyboard.press()` do NOT — they read the DOM as it is
 * right now, which after `goto()` is an empty `#root`. A test that skips this
 * fails as "the feature is broken" when it is only early.
 */
export async function appReady(page: Page): Promise<void> {
  // Every screen renders a `<main id="main">` — it is the skip link's target,
  // so it is the one element guaranteed to exist once anything has rendered.
  await base.expect(page.locator('#main')).toBeVisible();
}
