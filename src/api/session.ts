import type { Operator } from '@/domain/types';

/**
 * Who is signed in, and the credential that proves it.
 *
 * ── The access token lives in a module variable. That is the security model ──
 * §7.4 is explicit: never `localStorage`, never `sessionStorage`, never a
 * global. Both storages are readable by any script that reaches the page, so a
 * single injected script — a compromised dependency, a bad CDN, an XSS in a
 * field that renders operator-supplied text — walks away with a bearer token.
 * A module-scoped `let` is reachable only by code in this bundle.
 *
 * The cost is real and deliberate: a page refresh loses it. That is what the
 * refresh cookie is for — §8.3 issues the refresh token as an httpOnly,
 * `SameSite=Strict`, `Secure` cookie, which this bundle cannot read *and*
 * cannot lose. On boot the shell calls `refresh()` and gets a new access token
 * without the operator retyping anything. An httpOnly cookie is the only place
 * a browser can hold a 60-day credential that JavaScript cannot exfiltrate.
 *
 * ── An external store, not React state ──────────────────────────────────────
 * `api/client.ts` reads the token from a plain function on every request; it is
 * not a component and must not need one. Exposing the same value to React
 * through `useSyncExternalStore` means there is ONE token, not a copy in a
 * context that can lag a refresh that just happened mid-flight.
 */

export interface Session {
  readonly operator: Operator;
  /** Epoch milliseconds. Advisory — the server is the authority on expiry. */
  readonly expiresAt: number;
}

let accessToken: string | null = null;

/**
 * The snapshot object itself is the identity `useSyncExternalStore` compares.
 * Rebuilding it on every read would make React see a new value every render and
 * loop; it is replaced only when the session actually changes.
 */
let snapshot: Session | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** For `api/client.ts`. Deliberately not exported through any React surface. */
export function getAccessToken(): string | null {
  return accessToken;
}

export function getSession(): Session | null {
  return snapshot;
}

/**
 * A stable server snapshot for SSR/hydration paths.
 *
 * `useSyncExternalStore` demands a separate getter, and returning
 * `getSession()` here would be wrong in principle even though this app never
 * server-renders: there is no session on a server, by construction.
 */
export function getServerSession(): Session | null {
  return null;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSession(
  token: string,
  operator: Operator,
  expiresInSeconds: number,
  now: number,
): void {
  accessToken = token;
  snapshot = { operator, expiresAt: now + expiresInSeconds * 1000 };
  emit();
}

/**
 * Replaces the token while keeping the operator — what a silent refresh does.
 *
 * Separate from `setSession` because a refresh must NOT emit a new operator
 * object: every component reading the session would re-render mid-request for a
 * change none of them can see.
 */
export function renewAccessToken(token: string, expiresInSeconds: number, now: number): void {
  accessToken = token;

  if (snapshot !== null) {
    snapshot = { operator: snapshot.operator, expiresAt: now + expiresInSeconds * 1000 };
    emit();
  }
}

/**
 * Forgets everything. Called on sign-out and on a refresh that failed.
 *
 * Does not redirect: this module knows nothing about routing, and the route
 * guard already reads the session — so clearing it *is* the redirect, one
 * render later, from wherever the operator happened to be.
 */
export function clearSession(): void {
  accessToken = null;
  snapshot = null;
  emit();
}
