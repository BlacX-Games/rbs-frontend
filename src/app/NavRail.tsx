import { Link } from '@tanstack/react-router';
import {
  BarChart3,
  BookOpenText,
  ChevronsLeft,
  ChevronsRight,
  Radio,
  Settings2,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { NAV_GROUPS, NAV_GROUP_LABELS, railRoutes, type NavGroup } from '@/app/navigation';
import { useSession } from '@/app/session-context';
import { IconButton } from '@/components/primitives/IconButton';
import { Tooltip } from '@/components/primitives/Tooltip';
import { t } from '@/i18n/t';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/cn';

/**
 * The §4 left rail: five groups, 240px expanded and 64px collapsed.
 *
 * ── Gating, and what it deliberately does NOT do ────────────────────────────
 * An entry the operator's role cannot use is not rendered, and a group whose
 * every entry is gated away disappears with it — otherwise an `analyst` reads a
 * Balancing heading with nothing under it and concludes the console is broken.
 *
 * But hiding a rail entry is NOT a permission check. §7.4: the route still
 * resolves and renders `ForbiddenState`. Someone who bookmarked a screen before
 * their role changed gets an explanation instead of a blank page, and the
 * server refuses the data either way.
 *
 * ── Collapsed still shows labels ────────────────────────────────────────────
 * As tooltips, on hover AND on focus. A rail of unlabelled glyphs is a memory
 * test, and the failure is silent: the operator clicks the wrong one and
 * discovers where they are from the breadcrumb.
 */
const GROUP_ICONS: Readonly<Record<NavGroup, LucideIcon>> = {
  insights: BarChart3,
  ops: Radio,
  catalog: BookOpenText,
  balancing: SlidersHorizontal,
  system: Settings2,
};

export function NavRail({
  collapsed,
  onCollapsedChange,
}: {
  readonly collapsed: boolean;
  readonly onCollapsedChange: (collapsed: boolean) => void;
}) {
  const session = useSession();
  const role = session?.operator.role ?? null;

  const groups = NAV_GROUPS.map((group) => ({
    group,
    routes: railRoutes(group).filter(
      (route) => role !== null && (route.capability === null || can(role, route.capability)),
    ),
  })).filter((entry) => entry.routes.length > 0);

  return (
    <nav
      aria-label={t('nav.label')}
      className={cn(
        'bg-surface border-rule flex shrink-0 flex-col gap-16 border-e py-16',
        // §4's two widths. `transition-[width]` rather than an animated
        // `transform`, so nothing under the rail is repainted on a toggle —
        // and `motion-reduce` drops it entirely, per §5.4.
        'transition-[width] duration-150 motion-reduce:transition-none',
        collapsed ? 'w-64' : 'w-240',
      )}
    >
      <div className={cn('flex px-12', collapsed ? 'justify-center' : 'justify-end')}>
        <IconButton
          icon={collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          label={collapsed ? t('nav.expand') : t('nav.collapse')}
          onClick={() => {
            onCollapsedChange(!collapsed);
          }}
          variant="ghost"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-16 overflow-y-auto px-8">
        {groups.map(({ group, routes }) => {
          const Icon = GROUP_ICONS[group];

          return (
            <div className="flex flex-col gap-2" key={group}>
              {collapsed ? (
                // A rule, not a heading, when collapsed: a truncated group name
                // in a 64px column reads as a broken word, and the glyphs below
                // already carry their own labels.
                <div aria-hidden={true} className="border-rule mx-auto my-4 w-24 border-t" />
              ) : (
                <p className="text-ink-tertiary flex items-center gap-8 px-8 py-4 text-xs font-medium tracking-[0.14em] uppercase">
                  <Icon aria-hidden={true} className="size-16 shrink-0" />
                  {t(NAV_GROUP_LABELS[group])}
                </p>
              )}

              {routes.map((route) => {
                const label = t(route.label);

                const link = (
                  <Link
                    activeOptions={{ exact: route.path === '/ops' || route.path === '/insights' }}
                    className={cn(
                      'flex min-h-(--control-h) items-center gap-8 rounded-md px-8',
                      'text-ink-secondary hover:text-ink hover:bg-raised focus-visible:focus-ring',
                      'text-sm',
                      collapsed && 'justify-center',
                    )}
                    // TanStack renders the active class itself, so "which page
                    // am I on" is decided by the router's matching rather than
                    // by a string comparison here that has to know about
                    // trailing slashes and search params.
                    activeProps={{ className: 'bg-raised text-ink font-medium' }}
                    to={route.path}
                  >
                    {collapsed ? (
                      <Icon aria-hidden={true} className="size-16 shrink-0" />
                    ) : (
                      <span className="truncate">{label}</span>
                    )}
                    {collapsed ? <span className="sr-only">{label}</span> : null}
                  </Link>
                );

                return collapsed ? (
                  <Tooltip content={label} key={route.path} side="right" trigger={link} />
                ) : (
                  <div key={route.path}>{link}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
