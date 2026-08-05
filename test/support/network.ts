import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetRefreshState } from '@/api/client';
import { clearSession } from '@/api/session';
import { server } from '@/mocks/server';
import { resetMockState } from '@/mocks/handlers';

/**
 * Runs a suite against the real mock network.
 *
 * Called at the top of any suite that touches `api/`. The alternative — a
 * `vi.fn()` returning a hand-written object — tests the component against a
 * fiction, and the fiction is precisely where a contract quietly diverges: the
 * fake never sends `"18"` for an $18.00 price, never returns a 403 for the
 * wrong role, and never disagrees with the schema.
 *
 * `onUnhandledRequest: 'error'` is deliberately strict here where the browser
 * is lenient. In a test, a request nobody wrote a handler for is a bug in the
 * test; in a browser it is a font.
 *
 * Named `with…`, not `use…`: ESLint's `react-hooks/rules-of-hooks` treats any
 * `use`-prefixed call as a hook and rejects one at a module's top level, which
 * is exactly where this belongs. `e2e/fixtures.ts` renamed a parameter for the
 * same reason — cheaper than a disable comment, both times.
 */
export function withMockNetwork(): void {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    // Three kinds of leak, all of which surface as a failure in whichever file
    // happens to run second rather than in the one at fault: a per-test handler
    // override, a moderation edit, and a signed-in session.
    server.resetHandlers();
    resetMockState();
    clearSession();
    resetRefreshState();
  });

  afterAll(() => {
    server.close();
  });
}
