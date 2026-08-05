import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError, describe as describeError } from '@/api/errors';
import { request } from '@/api/client';
import { adminApi } from '@/api/endpoints';
import { getAccessToken, getSession } from '@/api/session';
import { server } from '@/mocks/server';
import { MOCK_OPERATORS, MOCK_PASSWORD } from '@/mocks/fixtures';
import { withMockNetwork } from '../../support/network';
import { z } from 'zod';

/**
 * The fetch wrapper, against the real mock network.
 *
 * The valuable cases are the ones a hand-written fake could not produce: a 401
 * that refreshes exactly once, a 2xx whose body does not match its schema, and
 * a role that the handlers genuinely refuse.
 */

withMockNetwork();

const owner = MOCK_OPERATORS.find((operator) => operator.role === 'owner');
const support = MOCK_OPERATORS.find((operator) => operator.role === 'support');
const player = MOCK_OPERATORS.find((operator) => operator.role === 'player');

if (owner === undefined || support === undefined || player === undefined) {
  throw new Error('The mock roster must carry an owner, a support, and a player account');
}

describe('authentication', () => {
  it('keeps the access token out of web storage entirely', async () => {
    await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);

    expect(getAccessToken()).not.toBeNull();

    // §7.4, and §11 step 6. The token lives in a module variable that only this
    // bundle can reach; anything in web storage is readable by any script that
    // gets onto the page.
    expect(JSON.stringify(localStorage)).not.toContain('mock.');
    expect(JSON.stringify(sessionStorage)).not.toContain('mock.');
    expect(localStorage.length).toBe(0);
  });

  it('returns the same envelope for a wrong password and an unknown email', async () => {
    // An account-enumeration oracle is just as real in a mock a reviewer reads
    // as in the backend it stands in for.
    const wrongPassword = await adminApi.auth
      .signIn(owner.email, 'not-the-password')
      .catch((error: unknown) => error);
    const unknownEmail = await adminApi.auth
      .signIn('nobody@rbs.local', MOCK_PASSWORD)
      .catch((error: unknown) => error);

    expect(wrongPassword).toBeInstanceOf(ApiError);
    expect(unknownEmail).toBeInstanceOf(ApiError);
    expect((wrongPassword as ApiError).code).toBe((unknownEmail as ApiError).code);
    expect((wrongPassword as ApiError).status).toBe(401);
  });

  it('signs out locally even when the server call fails', async () => {
    await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);
    server.use(http.post('*/admin/v1/auth/logout', () => HttpResponse.error()));

    await adminApi.auth.signOut().catch(() => undefined);

    // An operator who pressed "Sign out" on a flaky connection must not be left
    // holding a usable token.
    expect(getSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});

describe('the 401 interceptor', () => {
  it('refreshes once and replays the original request', async () => {
    await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);

    let attempts = 0;
    let refreshes = 0;

    server.use(
      http.get('*/admin/v1/players', () => {
        attempts += 1;
        // Expired on the first attempt, fine on the replay — exactly what an
        // access token reaching its 300s TTL mid-session looks like.
        if (attempts === 1) {
          return HttpResponse.json(
            { error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } },
            { status: 401 },
          );
        }
        return HttpResponse.json({ items: [], nextCursor: null, total: 0 });
      }),
      http.post('*/admin/v1/auth/refresh', () => {
        refreshes += 1;
        return HttpResponse.json({
          accessToken: `mock.${owner.id}`,
          expiresIn: 300,
          operator: {
            id: owner.id,
            email: owner.email,
            username: owner.username,
            role: owner.role,
          },
        });
      }),
    );

    const page = await adminApi.players.list({});

    expect(attempts).toBe(2);
    expect(refreshes).toBe(1);
    expect(page.items).toEqual([]);
    expect(getSession()).not.toBeNull();
  });

  it('coalesces concurrent refreshes into one', async () => {
    await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);

    const seen = new Set<string>();
    let refreshes = 0;

    server.use(
      http.get('*/admin/v1/players', ({ request: req }) => {
        const attempt = new URL(req.url).searchParams.get('q') ?? '';
        if (!seen.has(attempt)) {
          seen.add(attempt);
          return HttpResponse.json(
            { error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } },
            { status: 401 },
          );
        }
        return HttpResponse.json({ items: [], nextCursor: null, total: 0 });
      }),
      http.post('*/admin/v1/auth/refresh', () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: `mock.${owner.id}`, expiresIn: 300 });
      }),
    );

    await Promise.all([
      adminApi.players.list({ q: 'a' }),
      adminApi.players.list({ q: 'b' }),
      adminApi.players.list({ q: 'c' }),
    ]);

    // ONE refresh, not three. The backend revokes the whole token family on a
    // replayed refresh token (REFRESH_REUSE_DETECTED), so three concurrent
    // refreshes would sign the operator out every time the console loaded — and
    // would look like a security feature working correctly.
    expect(refreshes).toBe(1);
  });

  it('clears the session when the refresh itself fails', async () => {
    await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);

    server.use(
      http.get('*/admin/v1/players', () =>
        HttpResponse.json({ error: { message: 'nope', code: 'TOKEN_EXPIRED' } }, { status: 401 }),
      ),
      http.post('*/admin/v1/auth/refresh', () =>
        HttpResponse.json({ error: { message: 'nope' } }, { status: 401 }),
      ),
    );

    await expect(adminApi.players.list({})).rejects.toBeInstanceOf(ApiError);

    // Clearing the session IS the redirect: the route guard reads it.
    expect(getSession()).toBeNull();
  });

  it('does not attempt a refresh when nobody is signed in', async () => {
    let refreshes = 0;
    server.use(
      http.post('*/admin/v1/auth/refresh', () => {
        refreshes += 1;
        return HttpResponse.json({ error: { message: 'nope' } }, { status: 401 });
      }),
    );

    await expect(adminApi.players.list({})).rejects.toBeInstanceOf(ApiError);

    // A 401 from the sign-in screen must read as "wrong password", not send a
    // refresh against a cookie that does not exist.
    expect(refreshes).toBe(0);
  });
});

describe('failure shapes', () => {
  it('reports a schema mismatch as a contract failure, not a component bug', async () => {
    await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);
    server.use(
      http.get('*/admin/v1/players', () =>
        // A 2xx whose `items` is not an array — what a backend field rename
        // looks like from here.
        HttpResponse.json({ items: 'oops', nextCursor: null }),
      ),
    );

    const error = await adminApi.players.list({}).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).failure).toBe('contract');
    expect((error as ApiError).isRetryable).toBe(false);
  });

  it('reports a dead network as a transport failure, and offers a retry', async () => {
    server.use(http.post('*/admin/v1/auth/session', () => HttpResponse.error()));

    const error = await adminApi.auth
      .signIn(owner.email, MOCK_PASSWORD)
      .catch((cause: unknown) => cause);

    expect((error as ApiError).failure).toBe('transport');
    expect((error as ApiError).isRetryable).toBe(true);
    expect(describeError(error)).toMatch(/connection/i);
  });

  it('surfaces a 429 countdown from the RateLimit header, not the policy header', async () => {
    await adminApi.auth.signIn(owner.email, MOCK_PASSWORD);
    server.use(
      http.get('*/admin/v1/players', () =>
        HttpResponse.json(
          { error: { message: 'Too many requests — please slow down.', code: 'RATE_LIMITED' } },
          {
            status: 429,
            headers: {
              RateLimit: '"global"; r=0; t=42',
              'RateLimit-Policy': '"global"; q=300; w=900',
            },
          },
        ),
      ),
    );

    const error = (await adminApi.players.list({}).catch((cause: unknown) => cause)) as ApiError;

    expect(error.isRateLimited).toBe(true);
    expect(error.retryAfter).toBe(42);
    expect(error.rateLimit?.limit).toBe(300);
    expect(describeError(error)).toContain('42');
  });

  it('exposes validation issues without echoing the offending value', async () => {
    await adminApi.auth.signIn(support.email, MOCK_PASSWORD);

    // The handler rejects any key outside `isFeatured` / `reviewText`. Reaching
    // it requires bypassing `ReviewPatch`, which is a strict object — that both
    // layers refuse is the point (golden rule 2).
    const error = (await request('/reviews/whatever', {
      method: 'PATCH',
      body: { overallScore: 100 },
      schema: z.unknown(),
    }).catch((cause: unknown) => cause)) as ApiError;

    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.issues).toEqual([{ path: 'overallScore', message: 'Unrecognized key' }]);
    expect(JSON.stringify(error.issues)).not.toContain('100');
  });

  it('falls back to generic copy for a code newer than this bundle', () => {
    const error = new ApiError({
      failure: 'http',
      status: 409,
      code: 'SOME_FUTURE_CODE',
      message: 'internal detail that must not be rendered',
    });

    expect(describeError(error)).not.toContain('internal detail');
  });
});

describe('the role matrix, enforced by the network', () => {
  it('refuses a player token with 403, not 401', async () => {
    await adminApi.auth.signIn(player.email, MOCK_PASSWORD);

    const error = (await adminApi.players.list({}).catch((cause: unknown) => cause)) as ApiError;

    // 401 would send them back to sign in, where they would sign in as the same
    // player again, forever.
    expect(error.status).toBe(403);
  });

  it('lets support moderate a review and refuses an analyst', async () => {
    const analyst = MOCK_OPERATORS.find((operator) => operator.role === 'analyst');
    if (analyst === undefined) throw new Error('missing analyst fixture');

    await adminApi.auth.signIn(support.email, MOCK_PASSWORD);
    const page = await adminApi.reviews.list({ limit: 1 });
    const first = page.items[0];
    if (first === undefined) throw new Error('the fixtures must contain at least one review');

    const patched = await adminApi.reviews.patch(first.id, { isFeatured: true });
    expect(patched.isFeatured).toBe(true);

    await adminApi.auth.signIn(analyst.email, MOCK_PASSWORD);
    const error = (await adminApi.reviews
      .patch(first.id, { isFeatured: false })
      .catch((cause: unknown) => cause)) as ApiError;

    expect(error.status).toBe(403);
  });
});
