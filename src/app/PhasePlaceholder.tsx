import { EmptyState } from '@/components/patterns/states';
import { PHASES, type PhaseKey } from '@/app/navigation';
import { t, type StaticMessageKey } from '@/i18n/t';

/**
 * What a route renders before the phase that builds it lands.
 *
 * ── Why this exists rather than a blank page ────────────────────────────────
 * Phase 2's deliverable is "reach every route" — all forty of them — while
 * Phases 5–9 own the screens themselves. Between those, an operator walking the
 * console meets a lot of unbuilt pages, and a blank one cannot be told apart
 * from a broken one. This names the phase, so the answer to "is this finished?"
 * is on the screen instead of in a plan document.
 *
 * Built on `EmptyState` so it obeys the same rule every other state in the
 * system does: NAME THE NEXT ACTION. Here the next action belongs to us, not to
 * the operator, and saying so is the honest version.
 */
export function PhasePlaceholder({
  label,
  phase,
}: {
  readonly label: StaticMessageKey;
  readonly phase: PhaseKey;
}) {
  return (
    <EmptyState
      description={
        // The stage-2 Insights panels and the System screens are blocked on
        // data the backend has not built — §6.4 is explicit that such a panel
        // must say so rather than render a zero. Naming the blocker separates
        // "we have not written this" from "there is nothing to write it from".
        phase === 'insights2'
          ? `${t('state.phase.route', { screen: t(label), phase: t(PHASES[phase]) })} ${t('state.phase.blocked')}`
          : phase === 'backend'
            ? `${t('state.phase.route', { screen: t(label), phase: t(PHASES[phase]) })} ${t('state.phase.backendNote')}`
            : t('state.phase.route', { screen: t(label), phase: t(PHASES[phase]) })
      }
      title={t('state.phase.title')}
    />
  );
}
