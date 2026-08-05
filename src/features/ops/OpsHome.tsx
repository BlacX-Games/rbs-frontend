import { Link } from '@tanstack/react-router';
import { ArrowRight, CircleCheck, Flame, TriangleAlert } from 'lucide-react';
import { useOpsSummary } from '@/features/ops/queries';
import { EmptyState, ErrorState } from '@/components/patterns/states';
import { StatTile } from '@/components/patterns/StatTile';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/primitives/Skeleton';
import { describe } from '@/api/errors';
import type { OpsAlert } from '@/domain/types';
import { formatCount, formatDateTime, formatMoney, formatTime } from '@/i18n/format';
import { t } from '@/i18n/t';

/**
 * `/ops` — the §6.1 Live Ops home.
 *
 * Today's figures, the recent-services feed, and the anomaly strip. One request
 * serves all three: a screen that fired three would show three spinners and
 * three independent failures, and the operator would watch it assemble.
 */

/**
 * An alert's copy, composed HERE from structured data.
 *
 * The server sends a discriminated union — `kind` plus the figures — and never a
 * sentence. A `message: string` field would be the obvious shape and is wrong
 * twice: it ships untranslated English from a layer with no locale, and it puts
 * currency formatting somewhere `lib/money.ts` cannot reach, so the amount would
 * arrive as a raw decimal string or, worse, a float.
 */
function alertCopy(alert: OpsAlert): string {
  switch (alert.kind) {
    case 'negativeProfit':
      return t('ops.alert.negativeProfit', {
        restaurant: alert.restaurantName,
        amount: formatMoney(alert.profit),
      });
    case 'failedInspection':
      return t('ops.alert.failedInspection', {
        restaurant: alert.restaurantName,
        result: alert.result,
      });
    case 'burntOutStaff':
      return t('ops.alert.burntOutStaff', {
        restaurant: alert.restaurantName,
        count: alert.staffCount,
      });
  }
}

const ALERT_GLYPH = {
  negativeProfit: TriangleAlert,
  failedInspection: TriangleAlert,
  burntOutStaff: Flame,
} as const;

export function OpsHome() {
  const summary = useOpsSummary();

  if (summary.isPending) {
    return (
      <div aria-busy={true} className="flex flex-col gap-24">
        <Skeleton className="h-96" />
        <Skeleton lines={6} />
      </div>
    );
  }

  if (summary.isError) {
    return (
      <ErrorState
        action={
          <Button
            onClick={() => {
              void summary.refetch();
            }}
          >
            {t('action.retry')}
          </Button>
        }
        description={describe(summary.error)}
        title={t('state.error.title')}
      />
    );
  }

  const { today, alerts, recentSessions, asOf } = summary.data;

  return (
    <div className="flex flex-col gap-32">
      <header className="flex flex-wrap items-baseline justify-between gap-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t('ops.home.title')}
        </h1>
        {/*
          §6.4 requires every aggregate to carry the instant it was computed. On
          a screen that polls every fifteen seconds, "as of" is what lets an
          operator tell a stale panel from a quiet service.
        */}
        <p className="text-ink-tertiary text-xs">
          {t('ops.home.asOf', { time: formatTime(asOf) })}
        </p>
      </header>

      <div className="grid gap-16 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label={t('ops.stat.sessions')} value={formatCount(today.sessions)} />
        <StatTile label={t('ops.stat.covers')} value={formatCount(today.covers)} />
        {/* A pre-formatted STRING, straight from the exact path. */}
        <StatTile label={t('ops.stat.revenue')} value={formatMoney(today.revenue)} />
        <StatTile
          label={t('ops.stat.satisfaction')}
          // `null` is not zero. A service that scored nobody has no average, and
          // rendering 0 would report that every guest hated it.
          value={today.averageSatisfaction === null ? '—' : String(today.averageSatisfaction)}
          {...(today.averageSatisfaction === null
            ? { footer: <span className="text-ink-tertiary">{t('ops.stat.noServices')}</span> }
            : {})}
        />
        <StatTile
          label={t('ops.stat.moderation')}
          value={formatCount(today.reviewsAwaitingModeration)}
        />
      </div>

      <section aria-label={t('ops.alerts.label')} className="flex flex-col gap-12">
        <h2 className="text-ink text-md font-medium">{t('ops.alerts.title')}</h2>

        {alerts.length === 0 ? (
          <EmptyState
            description={t('ops.alerts.none.description')}
            title={t('ops.alerts.none.title')}
          />
        ) : (
          <ul className="flex flex-col gap-8">
            {alerts.map((alert) => {
              const Glyph = ALERT_GLYPH[alert.kind];

              return (
                <li
                  className="border-rule bg-surface flex flex-wrap items-center gap-12 rounded-md border p-12"
                  key={alert.id}
                >
                  {/*
                    Golden rule 9: the polarity rides on the GLYPH, and the text
                    stays ordinary ink. `--polarity-bad` clears 3:1 for marks,
                    not the 4.5:1 body-text floor.
                  */}
                  <Glyph aria-hidden={true} className="text-bad size-16 shrink-0" />
                  <p className="text-ink min-w-0 flex-1 text-sm">{alertCopy(alert)}</p>

                  {alert.kind === 'burntOutStaff' ? null : (
                    <Button asChild variant="ghost">
                      <Link params={{ sessionId: alert.sessionId }} to="/ops/sessions/$sessionId">
                        {t('ops.alert.view')}
                        <ArrowRight aria-hidden={true} className="size-16" />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label={t('ops.recent.title')} className="flex flex-col gap-12">
        <h2 className="text-ink text-md font-medium">{t('ops.recent.title')}</h2>

        {recentSessions.length === 0 ? (
          <EmptyState description={t('ops.recent.empty')} title={t('state.empty.title')} />
        ) : (
          <ul className="border-rule divide-hairline bg-surface divide-y rounded-md border">
            {recentSessions.map((session) => (
              <li
                className="flex min-h-(--row-h) flex-wrap items-center gap-12 px-12 py-8"
                key={session.id}
              >
                <span className="text-ink min-w-0 flex-1 truncate text-sm">
                  {session.restaurantName}
                </span>
                <span className="text-ink-secondary text-xs">{formatDateTime(session.date)}</span>
                <span className="text-ink-secondary tabular text-xs">
                  {formatCount(session.coversServed)}
                </span>
                <span className="text-ink tabular text-sm">{formatMoney(session.revenue)}</span>
                {/*
                  Profit carries a glyph as well as a colour, because a negative
                  service is the thing an operator scans this feed for.
                */}
                {session.profit.startsWith('-') ? (
                  <Badge icon={<TriangleAlert />} tone="bad">
                    {formatMoney(session.profit)}
                  </Badge>
                ) : (
                  <Badge icon={<CircleCheck />} tone="good">
                    {formatMoney(session.profit)}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-ink-tertiary text-xs">{t('ops.home.source')}</p>
      </section>
    </div>
  );
}
