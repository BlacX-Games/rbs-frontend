import { useSyncExternalStore } from 'react';
import { getServerSession, getSession, subscribe, type Session } from '@/api/session';
import { can, type Capability } from '@/lib/permissions';

/**
 * React's view of `api/session.ts`.
 *
 * `useSyncExternalStore`, not a context provider. The session already lives in
 * a module variable because `api/client.ts` reads it on every request and is
 * not a component — mirroring it into a provider would create a second copy
 * that can lag a refresh which just completed mid-flight, and the lag would
 * show up as a screen rendering the previous operator's permissions.
 *
 * The store's snapshot object is replaced only when the session genuinely
 * changes, so this does not re-render on every read.
 */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, getServerSession);
}

/**
 * `can()` for the signed-in operator.
 *
 * Signed out answers `false` for everything, which is the safe direction: a
 * component rendering during the moment between a cleared session and the
 * guard's redirect shows nothing rather than everything.
 *
 * Client-side only, and UX only — §7.4. The server is the authority, the mock
 * network enforces the same matrix, and this exists so an operator is not shown
 * a control that will 403.
 */
export function useCan(capability: Capability): boolean {
  const session = useSession();
  return session === null ? false : can(session.operator.role, capability);
}
