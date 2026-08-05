import { Link } from '@tanstack/react-router';
import { ArrowLeft, Download, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { describe } from '@/api/errors';
import { useCan } from '@/app/session-context';
import { Sparkline } from '@/components/charts/Sparkline';
import { ScoreDial } from '@/components/patterns/ScoreDial';
import { EmptyState, ErrorState } from '@/components/patterns/states';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Tooltip } from '@/components/primitives/Tooltip';
import {
  AGE_BRACKET_LABELS,
  AI_TIER_LABELS,
  AUTH_PROVIDER_LABELS,
  ROLE_LABELS,
} from '@/domain/enums';
import type { PlayerDetail as PlayerDetailData } from '@/domain/types';
import { usePlayer } from '@/features/ops/queries';
import { formatCount, formatDate, formatDateTime, formatMoney } from '@/i18n/format';
import { t } from '@/i18n/t';
import { toMinorUnits } from '@/lib/money';
import { sumMoney } from '@/lib/money';

/**
 * `/ops/players/$playerId` — the §6.1 detail screen.
 *
 * "Identity panel (providers, `createdAt`, `lastUsedAt` — **never**
 * `subjectHash`), restaurants, session history sparkline. Actions: Export
 * account, Delete account, Change role."
 *
 * The actions RENDER and are disabled. They are writes against a player
 * account, and golden rule 7 says no mutation exists without an audit row —
 * which needs the backend's audit table. Showing them disabled, with the reason,
 * is more honest than hiding them: an operator looking for "delete this account"
 * finds it and learns when it arrives, instead of concluding the console cannot
 * do it.
 */
export function PlayerDetail({ playerId }: { readonly playerId: string }) {
  const player = usePlayer(playerId);

  if (player.isPending) {
    return (
      <div aria-busy={true} className="flex flex-col gap-24">
        <Skeleton className="h-48" />
        <Skeleton lines={8} />
      </div>
    );
  }

  if (player.isError) {
    return (
      <ErrorState
        action={
          <Button asChild>
            <Link to="/ops/players">{t('ops.player.detail.back')}</Link>
          </Button>
        }
        description={describe(player.error)}
        title={t('state.error.title')}
      />
    );
  }

  return <PlayerRecord data={player.data} />;
}

function PlayerRecord({ data }: { readonly data: PlayerDetailData }) {
  const { player, identities, restaurants, recentSessions } = data;
  const canAct = useCan('gdpr.act');

  return (
    <div className="flex flex-col gap-32">
      <div className="flex flex-col gap-8">
        <Button asChild className="self-start" variant="ghost">
          <Link to="/ops/players">
            <ArrowLeft aria-hidden={true} className="size-16" />
            {t('ops.player.detail.back')}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-12">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {player.username ?? t('ops.player.anonymous')}
          </h1>
          <Badge>{ROLE_LABELS[player.role]}</Badge>
          <Badge>{AI_TIER_LABELS[player.aiTier]}</Badge>
        </div>

        <p className="text-ink-tertiary font-mono text-xs">{player.id}</p>
      </div>

      <div className="grid gap-24 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-24">
          <section aria-label={t('ops.player.detail.identity')} className="flex flex-col gap-12">
            <h2 className="text-ink text-md font-medium">{t('ops.player.detail.identity')}</h2>

            <EmailRow email={player.email} visible={canAct} />

            <dl className="grid grid-cols-2 gap-x-24 gap-y-8 text-sm sm:grid-cols-3">
              <Field
                label={t('ops.players.ageBracket')}
                value={player.ageBracket === null ? '—' : AGE_BRACKET_LABELS[player.ageBracket]}
              />
              <Field label={t('ops.player.createdAt')} value={formatDate(player.createdAt)} />
              <Field label={t('ops.player.lastActive')} value={formatDateTime(player.lastActive)} />
            </dl>

            {/*
              Providers and their timestamps, and NOTHING ELSE.
              `AuthIdentity.subjectHash` — the peppered HMAC of the OAuth subject
              — is absent from the wire type by construction, so there is nothing
              here to accidentally render. A hash of an identity is still an
              identifier (§6.1, golden rule 6).
            */}
            <table className="w-full text-left text-sm">
              <caption className="text-ink-tertiary pb-8 text-left text-xs">
                {t('ops.player.detail.identityCaption')}
              </caption>
              <thead>
                <tr className="border-rule border-b">
                  <th className="text-ink-tertiary py-4 text-xs font-medium" scope="col">
                    {t('ops.player.providers')}
                  </th>
                  <th className="text-ink-tertiary py-4 text-xs font-medium" scope="col">
                    {t('ops.player.detail.linkedAt')}
                  </th>
                  <th className="text-ink-tertiary py-4 text-xs font-medium" scope="col">
                    {t('ops.player.detail.lastUsed')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {identities.map((identity) => (
                  <tr className="border-hairline border-b" key={identity.provider}>
                    <th className="py-8 font-normal" scope="row">
                      {AUTH_PROVIDER_LABELS[identity.provider]}
                    </th>
                    <td className="text-ink-secondary py-8">{formatDate(identity.createdAt)}</td>
                    <td className="text-ink-secondary py-8">
                      {formatDateTime(identity.lastUsedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-label={t('ops.player.detail.restaurants')} className="flex flex-col gap-12">
            <h2 className="text-ink text-md font-medium">{t('ops.player.detail.restaurants')}</h2>

            {restaurants.length === 0 ? (
              <EmptyState
                description={t('ops.player.detail.noRestaurants')}
                title={t('state.empty.title')}
              />
            ) : (
              <ul className="flex flex-col gap-8">
                {restaurants.map((restaurant) => (
                  <li
                    className="border-rule bg-surface flex flex-wrap items-center gap-16 rounded-md border p-12"
                    key={restaurant.id}
                  >
                    <Link
                      className="text-gold-text min-w-0 flex-1 truncate rounded-sm text-sm underline underline-offset-4 focus-visible:focus-ring"
                      params={{ restaurantId: restaurant.id }}
                      to="/ops/restaurants/$restaurantId"
                    >
                      {restaurant.name}
                    </Link>
                    <span className="text-ink-secondary text-xs">{restaurant.conceptName}</span>
                    {/*
                      Reputation is a SIM OUTPUT. Rendered, never editable —
                      golden rule 2 has no admin override for a score.
                    */}
                    <ScoreDial
                      label={t('ops.player.detail.reputation')}
                      size={96}
                      value={restaurant.reputationScore}
                    />
                    <span className="text-ink tabular text-sm">
                      {formatMoney(restaurant.totalRevenue)}
                    </span>
                    <span className="text-ink-secondary tabular text-xs">
                      {formatCount(restaurant.totalServicesRun)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label={t('ops.player.detail.activity')} className="flex flex-col gap-12">
            <h2 className="text-ink text-md font-medium">{t('ops.player.detail.activity')}</h2>

            {recentSessions.length === 0 ? (
              <p className="text-ink-secondary text-sm">{t('ops.player.detail.noActivity')}</p>
            ) : (
              <div className="border-rule bg-surface flex flex-wrap items-center gap-24 rounded-md border p-16">
                <Sparkline
                  label={t('ops.player.detail.activity')}
                  points={recentSessions.map((session, index) => ({
                    // `ChartPoint.x` is a STRING: an axis label is a category,
                    // not a quantity, and typing it as a number invites a chart
                    // to interpolate between two services.
                    x: String(index),
                    // Minor units, so the sparkline's shape is exact. The figure
                    // beside it is formatted from the string; only the CHART
                    // becomes a number, and a chart's y-axis is a picture.
                    y: Number(toMinorUnits(session.revenue)),
                  }))}
                  summary={t('ops.player.detail.activitySummary', {
                    count: recentSessions.length,
                  })}
                />
                <span className="text-ink tabular text-sm">
                  {formatMoney(sumMoney(recentSessions.map((session) => session.revenue)))}
                </span>
              </div>
            )}
          </section>
        </div>

        <section aria-label={t('ops.player.detail.actions')} className="flex flex-col gap-12">
          <h2 className="text-ink text-md font-medium">{t('ops.player.detail.actions')}</h2>

          <div className="flex flex-col gap-8">
            <PendingAction icon={<Download />} label={t('ops.player.detail.export')} />
            <PendingAction icon={<Trash2 />} label={t('ops.player.detail.delete')} />
            <PendingAction icon={<ShieldAlert />} label={t('ops.player.detail.changeRole')} />
          </div>

          <p className="text-ink-secondary text-xs">{t('ops.player.detail.actionsPending')}</p>

          {canAct ? null : (
            <p className="text-ink-tertiary text-xs">{t('state.forbidden.description')}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-ink-tertiary text-xs">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

/**
 * An action that exists and does not work yet.
 *
 * `disabled` plus a tooltip naming the phase. A `title` attribute would not
 * reach a keyboard user, and a disabled button with no explanation is
 * indistinguishable from a bug.
 */
function PendingAction({
  label,
  icon,
}: {
  readonly label: string;
  readonly icon: React.ReactElement;
}) {
  return (
    <Tooltip
      content={t('ops.player.detail.actionsPending')}
      trigger={
        <span>
          <Button className="w-full" disabled={true} icon={icon}>
            {label}
          </Button>
        </span>
      }
    />
  );
}

/**
 * The email row. Golden rule 6: the only plaintext PII in the schema.
 *
 * Visible only to a role holding `gdpr.act`, masked until revealed, and the
 * reveal is a deliberate per-record act. §6.1 also requires every view of it to
 * be audited — that audit row needs the backend, so the reveal is local for now
 * and the write lands with Phase 5.
 */
function EmailRow({
  email,
  visible,
}: {
  readonly email: string | null;
  readonly visible: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  if (email === null) {
    return <p className="text-ink-secondary text-sm">{t('ops.player.noEmail')}</p>;
  }

  if (!visible) {
    return <p className="text-ink-secondary text-sm">{t('ops.player.emailRestricted')}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-12">
      <span className="text-ink-tertiary text-xs">{t('ops.player.email')}</span>
      {revealed ? (
        <span className="font-mono text-sm">{email}</span>
      ) : (
        <Button
          onClick={() => {
            setRevealed(true);
          }}
        >
          {t('ops.player.emailHidden')}
          <span className="sr-only"> {t('ops.player.emailReveal', { player: '' })}</span>
        </Button>
      )}
    </div>
  );
}
