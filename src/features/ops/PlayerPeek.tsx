import { Link } from '@tanstack/react-router';
import { describe } from '@/api/errors';
import { DetailDrawer, type DetailField } from '@/components/patterns/DetailDrawer';
import { ErrorState } from '@/components/patterns/states';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/primitives/Skeleton';
import { AGE_BRACKET_LABELS, AUTH_PROVIDER_LABELS, ROLE_LABELS } from '@/domain/enums';
import { usePlayer } from '@/features/ops/queries';
import { formatCount, formatDateTime, formatMoney } from '@/i18n/format';
import { sumMoney } from '@/lib/money';
import { t } from '@/i18n/t';

/**
 * The §4 peek: fast triage without losing the list.
 *
 * "Every list supports a right-side peek drawer (fast triage, preserves scroll
 * and filter state) and a full detail route (deep work, shareable URL)." The
 * peek is a VIEW of the list, so it does not navigate — the table, its filters,
 * and its scroll position are all still mounted behind it.
 *
 * It shares a query key with the full detail route, so opening the peek and
 * then following "Open the full record" is instant: the same cached response
 * serves both.
 *
 * Email is absent here ON PURPOSE. Golden rule 6 puts it on the detail screen
 * only, and a drawer is exactly the surface someone leaves open on a shared
 * screen while they talk.
 */
export function PlayerPeek({
  playerId,
  onClose,
}: {
  readonly playerId: string;
  readonly onClose: () => void;
}) {
  const player = usePlayer(playerId);

  const fields: DetailField[] =
    player.data === undefined
      ? []
      : [
          { label: t('ops.player.id'), value: player.data.player.id, mono: true },
          {
            label: t('ops.player.username'),
            value: player.data.player.username ?? t('ops.player.anonymous'),
          },
          {
            label: t('ops.player.providers'),
            value: player.data.identities
              .map((identity) => AUTH_PROVIDER_LABELS[identity.provider])
              .join(' · '),
          },
          {
            label: t('ops.players.ageBracket'),
            value:
              player.data.player.ageBracket === null
                ? '—'
                : AGE_BRACKET_LABELS[player.data.player.ageBracket],
          },
          { label: t('ops.player.role'), value: ROLE_LABELS[player.data.player.role] },
          {
            label: t('ops.player.restaurantCount'),
            value: formatCount(player.data.player.restaurantCount),
          },
          {
            label: t('ops.player.detail.revenue'),
            // Exact, through `lib/money.ts`. A `.reduce((a, b) => a + b)` over
            // these strings would concatenate them, and the bug would look like
            // an implausibly large number rather than a type error.
            value: formatMoney(
              sumMoney(player.data.restaurants.map((restaurant) => restaurant.totalRevenue)),
            ),
          },
          {
            label: t('ops.player.lastActive'),
            value: formatDateTime(player.data.player.lastActive),
          },
        ];

  return (
    <DetailDrawer
      closeLabel={t('action.close')}
      fields={fields}
      footer={
        <Button asChild variant="primary">
          <Link params={{ playerId }} to="/ops/players/$playerId">
            {t('ops.player.detail.openFull')}
          </Link>
        </Button>
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={true}
      title={t('ops.player.detail.peekTitle', {
        player: player.data?.player.username ?? t('ops.player.anonymous'),
      })}
    >
      {player.isPending ? (
        <div aria-busy={true}>
          <Skeleton lines={6} />
        </div>
      ) : player.isError ? (
        <ErrorState description={describe(player.error)} title={t('state.error.title')} />
      ) : null}
    </DetailDrawer>
  );
}
