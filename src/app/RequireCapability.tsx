import type { ReactNode } from 'react';
import { useSession } from '@/app/session-context';
import { ForbiddenState } from '@/components/patterns/states';
import { t } from '@/i18n/t';
import { can, type Capability } from '@/lib/permissions';

/**
 * Renders `ForbiddenState` where the role matrix says no.
 *
 * ── Why this is a component and not a `beforeLoad` redirect ─────────────────
 * §7.4: "The UI never hides a route the user can reach by URL; it renders
 * `ForbiddenState`." A redirect would bounce someone who bookmarked a screen
 * before their role changed to somewhere they did not ask for, leaving them to
 * work out whether the URL was wrong, the screen was deleted, or they lost
 * access. Rendering the refusal answers that.
 *
 * ── And why it is not security ─────────────────────────────────────────────
 * The server is the authority. Bypassing this reveals a screen whose every
 * request 403s — which is the whole point of the mock network enforcing the
 * same matrix: the shape of a bypass is an empty page, not leaked data.
 */
export function RequireCapability({
  capability,
  children,
}: {
  readonly capability: Capability | null;
  readonly children: ReactNode;
}) {
  const session = useSession();

  // `null` capability means "any operator", which the auth wall has already
  // established. A missing session here can only be the frame between a cleared
  // session and the guard's redirect — refuse rather than flash the content.
  const allowed =
    session !== null && (capability === null || can(session.operator.role, capability));

  if (allowed) return children;

  return (
    <ForbiddenState
      description={t('state.forbidden.description')}
      title={t('state.forbidden.title')}
    />
  );
}
