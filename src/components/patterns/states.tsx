import { Inbox, Lock, TriangleAlert } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The three states §5.6 calls components rather than afterthoughts.
 *
 * Every one of them NAMES THE NEXT ACTION. A screen that says "no results" and
 * stops has told an operator what they already knew; the useful half is what to
 * do about it — widen the filter, retry, ask for the role.
 *
 * They share one shell because their differences are only the glyph and the
 * tone, and three near-identical files drift.
 */
function StateShell({
  Icon,
  iconClassName,
  title,
  description,
  action,
  className,
  role,
}: {
  readonly Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  readonly iconClassName: string;
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly className?: string;
  readonly role?: 'alert' | 'status';
}) {
  return (
    <div
      className={cn(
        'border-rule bg-surface flex flex-col items-center gap-8 rounded-md border',
        // Generous, and NOT a fixed height. §5.6 forbids fixed-height text
        // containers, and a translated title at +30% is exactly what overflows
        // one of these.
        'px-24 py-48 text-center',
        className,
      )}
      role={role}
    >
      <Icon aria-hidden={true} className={cn('size-24 shrink-0', iconClassName)} />
      <p className="text-ink text-base font-medium">{title}</p>
      <p className="text-ink-secondary max-w-md text-sm">{description}</p>
      {action}
    </div>
  );
}

export type StateProps = {
  readonly title: string;
  readonly description: string;
  /** The next action, as a Button. Optional only where there genuinely is none. */
  readonly action?: ReactNode;
  readonly className?: string;
};

/** Nothing here yet, or nothing matched — not a failure. */
export function EmptyState(props: StateProps) {
  return <StateShell {...props} Icon={Inbox} iconClassName="text-ink-tertiary" />;
}

/**
 * Something went wrong. `role="alert"` because it replaces content the operator
 * was waiting for, and they need to know without re-reading the page.
 */
export function ErrorState(props: StateProps) {
  return <StateShell {...props} Icon={TriangleAlert} iconClassName="text-bad" role="alert" />;
}

/**
 * The role matrix says no.
 *
 * §7.4 is explicit that the UI never hides a route the operator can reach by
 * URL — it renders this instead. Hiding it would leave someone typing a URL
 * into a blank page with no idea whether it is broken or forbidden, and the
 * server is the authority either way.
 */
export function ForbiddenState(props: StateProps) {
  return <StateShell {...props} Icon={Lock} iconClassName="text-ink-tertiary" role="status" />;
}
