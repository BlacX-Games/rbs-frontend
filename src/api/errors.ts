import { ErrorEnvelopeSchema, ValidationIssueSchema } from '@/domain/schemas/primitives';
import type { ValidationIssue } from '@/domain/types';
import { t, type StaticMessageKey } from '@/i18n/t';
import { readRateLimit, retryAfterSeconds, type RateLimitState } from '@/lib/ratelimit';
import { z } from 'zod';

/**
 * Everything that can come back from the API that is not a success.
 *
 * ── One error type, because there is one envelope ───────────────────────────
 * `rbs-backend/src/middleware/errorHandler.ts` builds exactly one shape for
 * every non-2xx response — `{ error: { message, code?, details? } }` — and its
 * `docs/components.ts` names `error.code` "the stable contract the client
 * branches on". That is the entire contract we have, and it is a good one: a
 * screen branches on a string, never on a message it would have to keep in sync
 * with the server's wording.
 *
 * A network failure and a malformed body are folded into the same type on
 * purpose. Every call site has to handle "this did not work" anyway, and a
 * union of three error types means three `instanceof` checks at each of them.
 */

/**
 * Strips the `error.` prefix off every catalogue key, so the code list below
 * cannot name a code the catalogue has no message for.
 *
 * Distributes over the `MessageKey` union — a conditional type over a naked
 * type parameter does — which is what turns "the catalogue has these keys" into
 * "these are the codes we may claim to handle".
 */
type CodeWithMessage<K> = K extends `error.${infer Code}` ? Code : never;

/**
 * The codes `rbs-backend` actually throws, collected from every `AppError`
 * construction site in its `src/`.
 *
 * `satisfies` makes this a two-way check: a code added here without a message
 * fails to compile, and the catalogue test asserts the reverse shape. Codes are
 * NOT exhaustive of the future — an unknown one degrades to a generic message
 * rather than rendering the backend's raw English, which may name an internal.
 */
export const HANDLED_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
  'INVALID_CREDENTIALS',
  'INVALID_REFRESH_TOKEN',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_REUSE_DETECTED',
  'FORBIDDEN',
  'AGE_RESTRICTED',
  'PLAYER_NOT_FOUND',
  'EMAIL_TAKEN',
  'ALREADY_LINKED',
  'IDENTITY_IN_USE',
  'NOT_FOUND',
  // `RATE_LIMITED` is deliberately absent: its copy carries a `{seconds}`
  // countdown, so it cannot be resolved from a key alone. `describe()` handles
  // it by STATUS instead, above the code lookup — and constraining this list to
  // `StaticMessageKey` is what makes that separation a compile error to forget
  // rather than a convention.
] as const satisfies readonly CodeWithMessage<StaticMessageKey>[];

export type HandledErrorCode = (typeof HANDLED_ERROR_CODES)[number];

const HANDLED = new Set<string>(HANDLED_ERROR_CODES);

/**
 * Why a request failed, in the shape a screen wants to branch on.
 *
 * `transport` and `contract` have no HTTP status because they never reached, or
 * never came from, the error handler: the first is a dead network, the second
 * is a 2xx whose body did not match its schema.
 */
export type ApiFailure =
  /** The request never completed — offline, DNS, CORS, an aborted fetch. */
  | 'transport'
  /** A response arrived but did not match the schema it was parsed against. */
  | 'contract'
  /** The server answered with the standard error envelope. */
  | 'http';

export class ApiError extends Error {
  readonly failure: ApiFailure;
  /** `0` for a transport failure, which never got a status. */
  readonly status: number;
  /** The backend's stable machine-readable code, when it sent one. */
  readonly code: string | undefined;
  /** 4xx only, and per `validate.ts` it never contains the offending value. */
  readonly details: unknown;
  readonly rateLimit: RateLimitState | undefined;
  /** Seconds until a 429 lifts, when the headers said. */
  readonly retryAfter: number | undefined;

  constructor(init: {
    failure: ApiFailure;
    status?: number;
    code?: string | undefined;
    details?: unknown;
    rateLimit?: RateLimitState | undefined;
    retryAfter?: number | undefined;
    /** Developer-facing. NEVER rendered — `describe()` produces operator copy. */
    message: string;
    cause?: unknown;
  }) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });

    this.name = 'ApiError';
    this.failure = init.failure;
    this.status = init.status ?? 0;
    this.code = init.code;
    this.details = init.details;
    this.rateLimit = init.rateLimit;
    this.retryAfter = init.retryAfter;
  }

  /** `401`/`403`, i.e. "this session cannot do that" rather than "that went wrong". */
  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * Worth retrying without the operator changing anything.
   *
   * A 4xx is not: the request was wrong, and sending it again produces the same
   * answer. `ErrorState`'s "Try again" button reads this so it can be offered
   * only where it means something.
   */
  get isRetryable(): boolean {
    return this.failure === 'transport' || this.status >= 500 || this.status === 429;
  }

  /** The `[{path, message}]` issues from `validate.ts`, when this is a 400. */
  get issues(): readonly ValidationIssue[] {
    const parsed = z.array(ValidationIssueSchema).safeParse(this.details);
    return parsed.success ? parsed.data : [];
  }
}

/**
 * Operator-facing copy for a failure.
 *
 * Deliberately never `error.message`. On a 5xx the backend already replaces it
 * with the literal "Internal Server Error"; on a 4xx it is developer English
 * written for whoever is reading a log. Neither is copy for an operator, and
 * both would arrive untranslated.
 */
export function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return t('error.unknown');

  if (error.failure === 'transport') return t('error.network');
  if (error.failure === 'contract') return t('error.unknown');

  if (error.isRateLimited) {
    return error.retryAfter === undefined
      ? t('error.RATE_LIMITED.noCountdown')
      : t('error.RATE_LIMITED', { seconds: error.retryAfter });
  }

  if (error.status >= 500) return t('error.SERVER');

  // A code we have copy for. Anything else — a code from a backend version
  // newer than this bundle — falls through to the generic message rather than
  // rendering raw English that may name an internal.
  if (error.code !== undefined && HANDLED.has(error.code)) {
    return t(`error.${error.code}` as StaticMessageKey);
  }

  return t('error.unknown');
}

/**
 * Turns a non-2xx `Response` into an `ApiError`.
 *
 * The body is read defensively. A 502 from a proxy in front of the backend is
 * HTML, a 413 short-circuited by `body-parser` never reaches the app's error
 * handler at all (the backend documents this), and a dead gateway may send
 * nothing — none of those carry the envelope, and a parse failure there must
 * not replace a useful status with a JSON syntax error.
 */
export async function toApiError(response: Response, now: number): Promise<ApiError> {
  const rateLimit = readRateLimit(response.headers);
  const retryAfter = response.status === 429 ? retryAfterSeconds(response.headers, now) : null;

  let code: string | undefined;
  let details: unknown;
  let message = `HTTP ${String(response.status)}`;

  try {
    const parsed = ErrorEnvelopeSchema.safeParse(await response.json());

    if (parsed.success) {
      code = parsed.data.error.code;
      details = parsed.data.error.details;
      message = parsed.data.error.message;
    }
  } catch {
    /* Not JSON, or an empty body. The status is still the useful part. */
  }

  return new ApiError({
    failure: 'http',
    status: response.status,
    code,
    details,
    rateLimit,
    ...(retryAfter === null ? {} : { retryAfter }),
    message,
  });
}
