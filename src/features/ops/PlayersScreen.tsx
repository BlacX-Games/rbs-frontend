import { Link } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { describe } from '@/api/errors';
import { useCan } from '@/app/session-context';
import { DataTable } from '@/components/patterns/DataTable';
import { FilterBar } from '@/components/patterns/FilterBar';
import { EmptyState, ErrorState } from '@/components/patterns/states';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Pagination } from '@/components/primitives/Pagination';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/primitives/Skeleton';
import {
  AGE_BRACKETS,
  AGE_BRACKET_LABELS,
  AUTH_PROVIDERS,
  AUTH_PROVIDER_LABELS,
} from '@/domain/enums';
import type { PlayerRow } from '@/domain/types';
import { PlayerPeek } from '@/features/ops/PlayerPeek';
import { usePlayers } from '@/features/ops/queries';
import {
  ACTIVITY_WINDOWS,
  activeFilterCount,
  toPlayerQuery,
  type PlayerSort,
  type PlayersSearch,
} from '@/features/ops/players-search';
import { formatCount, formatDate, formatDateTime } from '@/i18n/format';
import { t } from '@/i18n/t';

/**
 * `/ops/players` — the §6.1 list, and Phase 2's proof that the whole path works.
 *
 * Every piece of state an operator can change lives in the URL, so the screen
 * is reconstructible from its address alone: filters, sort, the page cursor,
 * and even which row is open in the peek drawer.
 */

/** Route props, so this component stays testable without a router in the tree. */
export interface PlayersScreenProps {
  readonly search: PlayersSearch;
  readonly onSearchChange: (next: Partial<PlayersSearch>) => void;
}

const ANY = '__any';

export function PlayersScreen({ search, onSearchChange }: PlayersScreenProps) {
  const query = toPlayerQuery(search);
  const players = usePlayers(query);
  const canSeeEmail = useCan('gdpr.act');

  /*
   * The back-stack for cursor pagination.
   *
   * A cursor is forward-only — there is no "previous cursor" to compute — so
   * Previous walks a stack of the cursors already visited. It lives in
   * component state rather than the URL because a URL carrying its own history
   * is a URL that grows every time you page, and the thing worth linking is a
   * page, not the route taken to it.
   *
   * The honest consequence: after a refresh the stack is empty and Previous is
   * disabled, though the operator is still on the page they bookmarked.
   */
  const [backStack, setBackStack] = useState<readonly string[]>([]);

  const rows = players.data?.items ?? [];
  const total = players.data?.total;

  const goToPage = (cursor: string | undefined, stack: readonly string[]): void => {
    setBackStack(stack);
    onSearchChange({ cursor, peek: undefined });
  };

  const setFilter = (next: Partial<PlayersSearch>): void => {
    // Any filter change invalidates the cursor: page three of the old filter is
    // not page three of the new one, and sending the old cursor would land the
    // operator in the middle of a list they have not seen the start of.
    setBackStack([]);
    onSearchChange({ ...next, cursor: undefined, peek: undefined });
  };

  const sorting: SortingState =
    search.sort === undefined ? [] : [{ id: search.sort, desc: search.order !== 'asc' }];

  const columns = useMemo<ColumnDef<PlayerRow, never>[]>(
    () => [
      {
        id: 'username',
        header: t('ops.player.username'),
        accessorFn: (row) => row.username ?? t('ops.player.anonymous'),
        cell: ({ row }) => (
          <Link
            className="text-gold-text rounded-sm underline underline-offset-4 focus-visible:focus-ring"
            params={{ playerId: row.original.id }}
            to="/ops/players/$playerId"
          >
            {row.original.username ?? t('ops.player.anonymous')}
          </Link>
        ),
      },
      {
        id: 'email',
        header: t('ops.player.email'),
        accessorFn: (row) => row.email ?? '',
        enableSorting: false,
        cell: ({ row }) => <EmailCell player={row.original} visible={canSeeEmail} />,
        meta: {
          // The CSV must not become an export route around the role gate.
          toCsvValue: (row: PlayerRow) =>
            canSeeEmail ? (row.email ?? '') : t('ops.player.emailHidden'),
        },
      },
      {
        id: 'providers',
        header: t('ops.player.providers'),
        accessorFn: (row) => row.providers.join(', '),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-ink-secondary text-xs">
            {row.original.providers.map((provider) => AUTH_PROVIDER_LABELS[provider]).join(' · ')}
          </span>
        ),
      },
      {
        id: 'restaurantCount',
        header: t('ops.player.restaurantCount'),
        accessorFn: (row) => row.restaurantCount,
        cell: ({ row }) => formatCount(row.original.restaurantCount),
        meta: { numeric: true },
      },
      {
        id: 'createdAt',
        header: t('ops.player.createdAt'),
        accessorFn: (row) => row.createdAt,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'lastActive',
        header: t('ops.player.lastActive'),
        accessorFn: (row) => row.lastActive,
        cell: ({ row }) => formatDateTime(row.original.lastActive),
      },
    ],
    [canSeeEmail],
  );

  return (
    <div className="flex flex-col gap-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t('ops.players.title')}
      </h1>

      <FilterBar
        activeCount={activeFilterCount(search)}
        clearLabel={t('action.clearFilters')}
        label={t('ops.players.filters')}
        onClear={() => {
          setBackStack([]);
          onSearchChange({
            q: undefined,
            provider: undefined,
            ageBracket: undefined,
            activeWithinDays: undefined,
            hasRestaurants: undefined,
            cursor: undefined,
            peek: undefined,
          });
        }}
      >
        <Input
          className="min-w-64"
          label={t('ops.players.search')}
          onChange={(event) => {
            setFilter({ q: event.target.value === '' ? undefined : event.target.value });
          }}
          placeholder={t('ops.players.searchPlaceholder')}
          type="search"
          value={search.q ?? ''}
        />

        <Select
          items={[
            { value: ANY, label: t('ops.players.providerAny') },
            ...AUTH_PROVIDERS.map((provider) => ({
              value: provider,
              label: AUTH_PROVIDER_LABELS[provider],
            })),
          ]}
          label={t('ops.players.provider')}
          onValueChange={(next) => {
            setFilter({
              provider: next === ANY ? undefined : (next as PlayerRow['providers'][number]),
            });
          }}
          placeholder={t('ops.players.providerAny')}
          value={search.provider ?? ANY}
        />

        <Select
          items={[
            { value: ANY, label: t('ops.players.ageBracketAny') },
            ...AGE_BRACKETS.map((bracket) => ({
              value: bracket,
              label: AGE_BRACKET_LABELS[bracket],
            })),
          ]}
          label={t('ops.players.ageBracket')}
          onValueChange={(next) => {
            setFilter({
              ageBracket: next === ANY ? undefined : (next as (typeof AGE_BRACKETS)[number]),
            });
          }}
          placeholder={t('ops.players.ageBracketAny')}
          value={search.ageBracket ?? ANY}
        />

        <Select
          items={[
            { value: ANY, label: t('ops.players.activityAny') },
            { value: '7', label: t('ops.players.activity7') },
            { value: '30', label: t('ops.players.activity30') },
            { value: '90', label: t('ops.players.activity90') },
          ]}
          label={t('ops.players.activity')}
          onValueChange={(next) => {
            const days = ACTIVITY_WINDOWS.find((window) => String(window) === next);
            setFilter({ activeWithinDays: days });
          }}
          placeholder={t('ops.players.activityAny')}
          value={search.activeWithinDays === undefined ? ANY : String(search.activeWithinDays)}
        />

        <Select
          items={[
            { value: ANY, label: t('ops.players.ownsAny') },
            { value: 'yes', label: t('ops.players.ownsYes') },
            { value: 'no', label: t('ops.players.ownsNo') },
          ]}
          label={t('ops.players.owns')}
          onValueChange={(next) => {
            setFilter({ hasRestaurants: next === ANY ? undefined : next === 'yes' });
          }}
          placeholder={t('ops.players.ownsAny')}
          value={search.hasRestaurants === undefined ? ANY : search.hasRestaurants ? 'yes' : 'no'}
        />
      </FilterBar>

      {players.isError ? (
        <ErrorState
          action={
            <Button
              onClick={() => {
                void players.refetch();
              }}
            >
              {t('action.retry')}
            </Button>
          }
          description={describe(players.error)}
          title={t('state.error.title')}
        />
      ) : players.isPending ? (
        <div aria-busy={true}>
          <Skeleton lines={8} />
        </div>
      ) : (
        <>
          {/*
            `aria-busy` while a background refetch is in flight. The rows on
            screen are the PREVIOUS page's — `placeholderData` keeps them so the
            table does not blank on every keystroke — and a screen-reader user
            is entitled to know the answer is still settling.
          */}
          <div aria-busy={players.isPlaceholderData}>
            <DataTable
              caption={t('ops.players.caption')}
              columns={columns}
              empty={
                <EmptyState
                  description={t('ops.players.empty.description')}
                  title={t('ops.players.empty.title')}
                />
              }
              exportFilename="players.csv"
              exportLabel={t('action.exportCsv')}
              columnsLabel={t('action.columns')}
              onSortingChange={(next) => {
                const first = next[0];
                setBackStack([]);
                onSearchChange({
                  sort: first === undefined ? undefined : (first.id as PlayerSort),
                  order: first === undefined ? undefined : first.desc ? 'desc' : 'asc',
                  cursor: undefined,
                });
              }}
              rowId={(row) => row.id}
              rows={rows}
              sorting={sorting}
            />
          </div>

          <Pagination
            hasNext={players.data.nextCursor !== null}
            hasPrevious={backStack.length > 0}
            label={t('pagination.label')}
            nextLabel={t('action.next')}
            previousLabel={t('action.previous')}
            onNext={() => {
              const next = players.data.nextCursor;
              if (next === null) return;
              goToPage(next, [...backStack, search.cursor ?? '']);
            }}
            onPrevious={() => {
              const previous = backStack.at(-1);
              goToPage(previous === '' ? undefined : previous, backStack.slice(0, -1));
            }}
            rangeLabel={
              total === undefined
                ? t('pagination.rangeUnknown', {
                    from: formatCount(1),
                    to: formatCount(rows.length),
                  })
                : t('pagination.range', {
                    from: formatCount(1),
                    to: formatCount(rows.length),
                    total: formatCount(total),
                  })
            }
          />
        </>
      )}

      {search.peek === undefined ? null : (
        <PlayerPeek
          onClose={() => {
            onSearchChange({ peek: undefined });
          }}
          playerId={search.peek}
        />
      )}
    </div>
  );
}

/**
 * Player email — the only plaintext PII in the schema (golden rule 6).
 *
 * Role-gated AND masked by default even for a role that may see it: a support
 * operator screen-sharing a triage session should not broadcast forty addresses
 * to whoever is in the call. Revealing is a deliberate act, per row.
 */
function EmailCell({ player, visible }: { readonly player: PlayerRow; readonly visible: boolean }) {
  const [revealed, setRevealed] = useState(false);

  if (player.email === null) {
    return <span className="text-ink-tertiary text-xs">{t('ops.player.anonymous')}</span>;
  }

  if (!visible) {
    return <span className="text-ink-tertiary text-xs">{t('ops.player.emailHidden')}</span>;
  }

  if (revealed) return <span className="font-mono text-xs">{player.email}</span>;

  return (
    <Button
      onClick={() => {
        setRevealed(true);
      }}
      variant="ghost"
    >
      {t('ops.player.emailHidden')}
      <span className="sr-only">
        {' '}
        {t('ops.player.emailReveal', { player: player.username ?? player.id })}
      </span>
    </Button>
  );
}
