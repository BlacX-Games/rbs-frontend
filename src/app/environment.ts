import type { StaticMessageKey } from '@/i18n/t';
import { env } from '@/lib/env';

/**
 * Which backend the console is pointed at, for the top-bar badge (§4).
 *
 * ── Why this is a safety feature, not decoration ────────────────────────────
 * §4 asks for it because "production is visually distinct so nobody publishes
 * balancing to the wrong place". Publishing a balancing version rewrites the
 * magnitudes the live game runs on; doing it against production while believing
 * you are on staging is the single most expensive mistake this console makes
 * possible, and the only defence before the typed confirmation is knowing where
 * you are.
 *
 * Derived from the API base URL rather than from a build flag, because the base
 * URL is what actually determines where a write lands. A separate
 * `VITE_ENVIRONMENT` var could disagree with it, and would disagree exactly
 * when someone points a staging build at production to debug something.
 */
export const ENVIRONMENTS = ['local', 'staging', 'production'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const ENVIRONMENT_LABELS: Readonly<Record<Environment, StaticMessageKey>> = {
  local: 'topbar.environment.local',
  staging: 'topbar.environment.staging',
  production: 'topbar.environment.production',
};

export function resolveEnvironment(apiBaseUrl: string, hostname: string): Environment {
  // Empty base = same-origin, which in dev is the Vite `/admin` proxy. The
  // hostname is then the honest signal.
  const target = apiBaseUrl === '' ? hostname : apiBaseUrl;

  if (/localhost|127\.0\.0\.1|\.local\b/.test(target)) return 'local';
  if (/\bstaging\b|\bstage\b|\bpreview\b|\bdev\b/.test(target)) return 'staging';

  /*
   * Everything unrecognised is PRODUCTION.
   *
   * The default has to be the cautious one. Guessing "staging" for an unknown
   * host would hide the warning on precisely the deployment nobody configured
   * carefully — and an operator who sees a production badge on staging loses a
   * second, where the reverse loses a live balancing version.
   */
  return 'production';
}

export const environment: Environment = resolveEnvironment(
  env.apiBaseUrl,
  typeof globalThis.location === 'undefined' ? '' : globalThis.location.hostname,
);
