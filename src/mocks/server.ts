import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

/**
 * The mock network, in Vitest.
 *
 * `msw/node` patches Node's HTTP layer rather than registering a service
 * worker, so the SAME handlers serve both the browser and the test run. That
 * shared definition is the point: a test that passes against a hand-written
 * `vi.fn()` proves the component works against a fiction, and the fiction is
 * exactly where the contract quietly diverges.
 *
 * Lifecycle lives in `test/support/network.ts`, not here — a module that starts
 * a server on import cannot be imported by a suite that does not want one.
 */
export const server = setupServer(...handlers);
