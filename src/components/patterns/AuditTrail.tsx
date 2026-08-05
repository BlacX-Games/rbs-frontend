import type { ReactNode } from 'react';
import { Avatar } from '@/components/primitives/Avatar';
import { Badge } from '@/components/primitives/Badge';
import { cn } from '@/lib/cn';

export interface AuditEntry {
  readonly id: string;
  /** Who. Display name only — never the email, which §6.1 role-gates. */
  readonly actor: string;
  /** The action code as recorded: `balancing.publish`, `player.delete`. */
  readonly action: string;
  /** What it acted on, in words. */
  readonly target: string;
  /** Pre-formatted and absolute. See below on why not "3 hours ago". */
  readonly at: string;
  /** ISO 8601, for the `<time>` element's machine-readable value. */
  readonly atDateTime: string;
  /** The before/after, usually a JsonDiff. */
  readonly detail?: ReactNode;
}

export type AuditTrailProps = {
  readonly caption: string;
  readonly entries: readonly AuditEntry[];
  readonly empty?: ReactNode;
  readonly className?: string;
};

/**
 * Reverse-chronological actor / action / target / diff.
 *
 * Golden rule 7 says no admin mutation exists without an `AdminAuditLog` row,
 * which makes this the surface that proves it. Two decisions follow from that:
 *
 * • Timestamps are ABSOLUTE, not relative. "3 hours ago" is friendlier and
 *   useless in an audit context — an operator reconciling this against a
 *   backend log needs the same instant the database recorded, and relative time
 *   also silently drifts as the page sits open. The `<time datetime>` carries
 *   the machine-readable form alongside.
 * • The actor is a display name. §6.1 gates player email behind role and audits
 *   every view of it; an audit feed that printed emails would leak PII into the
 *   very screen meant to demonstrate that PII is handled properly.
 */
export function AuditTrail({ caption, entries, empty, className }: AuditTrailProps) {
  if (entries.length === 0 && empty !== undefined) return <>{empty}</>;

  return (
    <section aria-label={caption} className={cn('flex flex-col', className)}>
      {/* An ordered list, because reverse-chronological order IS the meaning.
          A stack of divs tells a screen reader nothing about sequence. */}
      <ol className="flex flex-col">
        {entries.map((entry) => (
          <li className="border-hairline flex gap-12 border-b py-12 last:border-b-0" key={entry.id}>
            <Avatar className="mt-2" name={entry.actor} size={24} />

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <p className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-ink font-medium">{entry.actor}</span>
                {/* The action code verbatim, in mono. It is what the operator
                    will grep the backend log for, so it must not be prettified
                    into something that no longer matches. */}
                <Badge>
                  <span className="font-mono">{entry.action}</span>
                </Badge>
                <span className="text-ink-secondary truncate">{entry.target}</span>
              </p>

              <time className="text-ink-tertiary tabular text-xs" dateTime={entry.atDateTime}>
                {entry.at}
              </time>

              {entry.detail}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
