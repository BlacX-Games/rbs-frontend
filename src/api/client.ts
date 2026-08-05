import type { z } from 'zod';
import { ApiError, toApiError } from '@/api/errors';
import { clearSession, getAccessToken, getSession, renewAccessToken } from '@/api/session';
import { RefreshResponseSchema } from '@/domain/schemas/admin';
import { env } from '@/lib/env';

/**
 * The one `fetch` in the application.
 *
 * Everything the network layer owes a screen happens here: the base URL, the
 * bearer header, the refresh cookie, the error envelope, the single retry after
 * a silent token refresh, and the schema parse that makes a response a typed
 * value instead of an `any`.
 *
 * ── Why MSW intercepts here rather than a mock adapter existing ─────────────
 * `VITE_USE_MOCKS` never appears in this file. MSW patches `fetch` at the
 * network layer, so the application code is BYTE-IDENTICAL in mock and live
 * mode — there is no "mock branch" that can be forgotten, and no second code
 * path that works in the demo and not in production. §1.4 chose this
 * deliberately over an `AdminApi` implementation per mode.
 */

/** `/admin/v1` — §12. The game surface stays unversioned at the root. */
const ADMIN_PREFIX = '/admin/v1';

export type QueryValue = string | number | boolean | undefined | null;

/**
 * Builds the URL, dropping empty parameters entirely.
 *
 * `?q=` and `?q=undefined` are both requests the backend would have to defend
 * against, and both are how a cleared filter starts matching nothing instead of
 * everything. An absent parameter is the only honest way to say "not filtered".
 */
function buildUrl(path: string, query?: Readonly<Record<string, QueryValue>>): string {
  const url = `${env.apiBaseUrl}${ADMIN_PREFIX}${path}`;
  if (query === undefined) return url;

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search === '' ? url : `${url}?${search}`;
}

export interface RequestOptions<T> {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly body?: unknown;
  /** The schema a 2xx body is parsed through. Omit for a 204. */
  readonly schema?: z.ZodType<T>;
  readonly signal?: AbortSignal;
}

/**
 * A refresh in flight, shared by every request that hit a 401 at once.
 *
 * Without this, a dashboard that fires six queries on mount and finds an
 * expired token sends six refreshes. Five of them present a token the first has
 * already rotated — and `rbs-backend`'s refresh flow treats a replayed token as
 * a stolen one: `services/auth/session.ts:82-130` revokes the entire family and
 * throws `REFRESH_REUSE_DETECTED`. Loading the console would sign the operator
 * out, every time, and look like a security feature working correctly.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    // No body and no bearer: the credential is the httpOnly cookie, which the
    // browser attaches because of `credentials: 'include'` and which this code
    // cannot read.
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });

    if (!response.ok) return false;

    const body: unknown = await response.json();
    const parsed = RefreshResponseSchema.safeParse(body);

    if (!parsed.success) return false;

    renewAccessToken(parsed.data.accessToken, parsed.data.expiresIn, Date.now());
    return true;
  } catch {
    return false;
  }
}

/** Coalesces concurrent refreshes into one, and clears the slot when it settles. */
function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function send(url: string, options: RequestOptions<unknown>): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers({ accept: 'application/json' });

  if (token !== null) headers.set('authorization', `Bearer ${token}`);
  if (options.body !== undefined) headers.set('content-type', 'application/json');

  return fetch(url, {
    method: options.method ?? 'GET',
    headers,
    // Always, not only on the refresh call: the cookie is `SameSite=Strict`, so
    // it rides only on same-site requests anyway, and omitting it here would
    // mean the browser never receives a rotated one.
    credentials: 'include',
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
}

export async function request<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const url = buildUrl(path, options.query);

  let response: Response;

  try {
    response = await send(url, options);
  } catch (cause) {
    // An aborted request is a cancelled query, not a failure worth surfacing —
    // rethrow it untouched so TanStack Query recognises its own abort rather
    // than reporting "could not reach the server" for a screen the operator
    // navigated away from.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;

    throw new ApiError({
      failure: 'transport',
      message: `Network request failed: ${options.method ?? 'GET'} ${path}`,
      cause,
    });
  }

  /*
   * Refresh once, then replay once. Never more.
   *
   * Guarded on there being a session at all: an unauthenticated 401 from the
   * sign-in screen must surface as "wrong password", not trigger a refresh
   * against a cookie that does not exist. A second 401 after a successful
   * refresh means the token is fine and the ROLE is not, so retrying is a loop.
   */
  if (response.status === 401 && getSession() !== null) {
    const refreshed = await refreshOnce();

    if (refreshed) {
      response = await send(url, options);
    }

    if (response.status === 401) {
      // The route guard reads the session, so clearing it is the redirect.
      clearSession();
    }
  }

  if (!response.ok) throw await toApiError(response, Date.now());

  // A 204 carries no body, and `response.json()` on one throws. Callers that
  // expect nothing pass no schema, and get `undefined` typed as their `T`.
  if (options.schema === undefined || response.status === 204) {
    return undefined as T;
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch (cause) {
    throw new ApiError({
      failure: 'contract',
      status: response.status,
      message: `Expected JSON from ${path}`,
      cause,
    });
  }

  const parsed = options.schema.safeParse(body);

  if (!parsed.success) {
    /*
     * A 2xx whose body does not match its schema is a CONTRACT failure, not a
     * bug in the screen that asked for it — and it is the single most valuable
     * thing this layer reports. `/admin/v1` does not exist yet, so today this
     * fires when a mock handler and its schema disagree; the day a real backend
     * appears, it is what says the contract moved, at the seam, instead of
     * three components deep as "undefined is not an object".
     */
    throw new ApiError({
      failure: 'contract',
      status: response.status,
      message: `Response from ${path} did not match its schema: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')} ${issue.message}`)
        .join('; ')}`,
      cause: parsed.error,
    });
  }

  return parsed.data;
}

/** Test seam. Nothing in `src/` calls it; `test/` uses it to isolate suites. */
export function resetRefreshState(): void {
  refreshInFlight = null;
}
