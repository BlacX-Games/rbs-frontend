import { z } from 'zod';

/**
 * Typed, validated build-time configuration.
 *
 * Mirrors `rbs-backend/src/config/env.ts`: fail fast and name the offending key
 * rather than let a misconfigured base URL surface later as a mystery 404. Vars
 * belonging to later phases are documented in `.env.example` and stay out of
 * this schema until something actually consumes them.
 *
 * `VITE_DEV_PROXY_TARGET` is deliberately absent — it configures the Vite dev
 * server (`vite.config.ts`), never the application.
 */
const EnvSchema = z.object({
  /**
   * Base URL the API client prefixes onto `/admin/v1/...`. Empty means
   * same-origin, which in dev is the Vite `/admin` proxy — the backend has no
   * CORS middleware until its own Phase 3.
   */
  VITE_API_BASE_URL: z
    .string()
    .refine((value) => !value.endsWith('/'), {
      message: 'must not end with a trailing slash',
    })
    .default(''),
  /** Serve the MSW mock network instead of a real backend. Wired in Phase 2. */
  VITE_USE_MOCKS: z.enum(['true', 'false']).default('true'),
});

export interface Env {
  /** Empty string = same-origin. Never has a trailing slash. */
  readonly apiBaseUrl: string;
  readonly useMocks: boolean;
}

/**
 * Pure and testable: a raw env record in, validated config out. Throws with
 * every offending key named, because a half-configured dashboard is worse than
 * one that refuses to start.
 */
export function parseEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid frontend environment — ${detail}`);
  }

  return {
    apiBaseUrl: result.data.VITE_API_BASE_URL,
    useMocks: result.data.VITE_USE_MOCKS === 'true',
  };
}

export const env: Env = parseEnv(import.meta.env);
