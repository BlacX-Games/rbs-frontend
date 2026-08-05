import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Global test environment.
 *
 * Two jobs: teach jsdom the handful of DOM APIs Radix calls unconditionally,
 * and undo the global state a render leaves behind. Both are here rather than
 * in each suite because the alternative is the same six lines copied into
 * eighteen files, where one copy eventually drifts.
 */

/*
 * jsdom 29 implements none of these, and Radix does not feature-detect them.
 * `Select.Trigger`'s pointer-down handler calls `hasPointerCapture` on the way
 * in, so without the stub every Select test dies with an opaque TypeError
 * inside node_modules rather than a failed assertion.
 *
 * Stubbed as no-ops on purpose. Faking real pointer-capture or layout semantics
 * would let a test assert behaviour the browser does not actually have; the
 * things these APIs enable — capture-based drags, scroll-into-view, size
 * observation — are verified in Playwright, where they are real.
 */
// Tested with `in` rather than `??=`: reading `Element.prototype.method` to
// check it is an unbound-method reference, which the lint rule rejects — and
// rightly, since that is also how you accidentally detach `this`. The guard
// also means a future jsdom that implements these properly keeps its own.
if (!('hasPointerCapture' in Element.prototype)) {
  Object.assign(Element.prototype, {
    hasPointerCapture: vi.fn(() => false),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  });
}

if (!('scrollIntoView' in Element.prototype)) {
  Object.assign(Element.prototype, { scrollIntoView: vi.fn() });
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  // `globals: false` in the Vitest config means Testing Library cannot register
  // its own auto-cleanup hook, so it is wired explicitly. Without this, mounted
  // trees leak between test files and `getByRole` starts matching stale nodes.
  cleanup();

  // `renderWithProviders` seeds localStorage and the provider stamps <html>;
  // `cleanup()` reverses neither, because both live outside the React tree. A
  // suite that ran in the light theme would otherwise hand the next suite a
  // light theme it never asked for — and the failure surfaces in whichever file
  // happens to run second, not in the one at fault.
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
});
