import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, Search, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApi } from '@/api/endpoints';
import { ENVIRONMENT_LABELS, environment } from '@/app/environment';
import { useActiveConsoleRoute } from '@/app/active-route';
import { CONSOLE_ROUTES, NAV_GROUP_LABELS } from '@/app/navigation';
import { useSession } from '@/app/session-context';
import { Badge } from '@/components/primitives/Badge';
import { Breadcrumb, type Crumb } from '@/components/primitives/Breadcrumb';
import { Button } from '@/components/primitives/Button';
import { CommandPalette, type Command } from '@/components/primitives/CommandPalette';
import { DropdownMenu } from '@/components/primitives/DropdownMenu';
import { Kbd } from '@/components/primitives/Kbd';
import { DensityToggle, ThemeToggle } from '@/design/ThemeControls';
import { ROLE_LABELS } from '@/domain/enums';
import { t } from '@/i18n/t';
import { can } from '@/lib/permissions';

/**
 * The §4 top bar: breadcrumb, ⌘K, environment badge, theme, density, account.
 */
export function TopBar() {
  const navigate = useNavigate();
  const session = useSession();
  const [paletteOpen, setPaletteOpen] = useState(false);

  /*
   * ⌘K / Ctrl-K, bound at the window because the palette has no trigger on
   * screen to hang a shortcut off.
   *
   * `metaKey || ctrlKey` covers both platforms without sniffing the user agent
   * — a Mac user pressing Ctrl-K means the same thing, and refusing it would be
   * a purity that costs them the shortcut.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'k' || !(event.metaKey || event.ctrlKey)) return;

      // Chrome and Firefox both bind ⌘K to the address bar.
      event.preventDefault();
      setPaletteOpen((open) => !open);
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => {
      globalThis.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  /*
   * The breadcrumb is derived from the ROUTER's matches, not from splitting the
   * URL on slashes.
   *
   * Splitting would render `$playerId` — or worse, a raw UUID — as a crumb, and
   * would invent a crumb for every path segment that is only a layout. The
   * router already knows which routes actually matched; `navigation.ts` knows
   * what each is called.
   */
  const crumbs: Crumb[] = [];
  const route = useActiveConsoleRoute();

  if (route !== undefined) {
    crumbs.push({ label: t(NAV_GROUP_LABELS[route.group]) });
    crumbs.push({ label: t(route.label) });
  }

  const role = session?.operator.role ?? null;

  /*
   * Every route the operator may reach, as a command.
   *
   * Fed from the same table as the rail, so a screen cannot be reachable by ⌘K
   * and absent from the rail — or, much worse, offered by ⌘K to a role that
   * will 403 on arrival. Detail routes are excluded: their paths carry a param
   * the palette has no value for.
   */
  const commands: Command[] = CONSOLE_ROUTES.filter(
    (candidate) =>
      candidate.inRail &&
      role !== null &&
      (candidate.capability === null || can(role, candidate.capability)),
  ).map((candidate) => ({
    id: candidate.path,
    label: t(candidate.label),
    group: t(NAV_GROUP_LABELS[candidate.group]),
    ...(candidate.keywords === undefined ? {} : { keywords: candidate.keywords }),
    onSelect: () => {
      void navigate({ to: candidate.path });
    },
  }));

  return (
    <header
      aria-label={t('topbar.label')}
      className="bg-surface border-rule flex flex-wrap items-center gap-16 border-b px-16 py-8"
    >
      <Breadcrumb className="min-w-0 flex-1" items={crumbs} label={t('nav.breadcrumb')} />

      <Button
        className="max-w-64"
        icon={<Search />}
        onClick={() => {
          setPaletteOpen(true);
        }}
        variant="ghost"
      >
        {t('palette.open')}
        <Kbd>⌘K</Kbd>
      </Button>

      {/*
        The environment badge (§4). Production is `bad`-toned and carries a
        warning glyph — not because production is an error, but because
        publishing a balancing version to it by mistake is the most expensive
        thing this console makes possible, and the badge is the only warning
        before the typed confirmation.

        `tone` requires an `icon` in the type system, so this cannot become
        colour alone (golden rule 9) even if someone tries.
      */}
      {environment === 'production' ? (
        <Badge icon={<TriangleAlert />} tone="bad">
          {t(ENVIRONMENT_LABELS[environment])}
        </Badge>
      ) : (
        <Badge>{t(ENVIRONMENT_LABELS[environment])}</Badge>
      )}

      <ThemeToggle />
      <DensityToggle />

      {session === null ? null : (
        <DropdownMenu
          align="end"
          items={[
            {
              id: 'signout',
              label: t('topbar.signOut'),
              Icon: LogOut,
              onSelect: () => {
                void adminApi.auth.signOut().finally(() => {
                  // `signOut` clears the session either way, so the guard on
                  // `_console` would redirect on the next render regardless.
                  // Navigating explicitly means the operator does not watch a
                  // dead screen re-render first.
                  void navigate({ to: '/signin' });
                });
              },
            },
          ]}
          label={t('topbar.account')}
          trigger={
            <Button variant="ghost">
              <span className="truncate">
                {session.operator.username ?? session.operator.email}
              </span>
              <span className="text-ink-tertiary text-xs">
                {ROLE_LABELS[session.operator.role]}
              </span>
            </Button>
          }
        />
      )}

      <CommandPalette
        commands={commands}
        emptyLabel={t('palette.empty')}
        label={t('palette.label')}
        onOpenChange={setPaletteOpen}
        open={paletteOpen}
        placeholder={t('palette.placeholder')}
      />

      {/* Dev affordance, and honest about itself: an operator looking at
          plausible numbers deserves to know they came from a fixture. */}
      {import.meta.env.DEV ? (
        <Link className="text-ink-tertiary hover:text-ink text-xs underline" to="/design">
          {t('route.design')}
        </Link>
      ) : null}
    </header>
  );
}
