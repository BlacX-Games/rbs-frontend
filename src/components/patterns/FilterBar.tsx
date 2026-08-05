import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

export type FilterBarProps = {
  /** Names the region — "Session filters". A page may carry several. */
  readonly label: string;
  readonly children: ReactNode;
  /** Shown only when something is actually filtered. */
  readonly onClear?: () => void;
  readonly clearLabel?: string;
  /** How many filters are active, for the clear button's accessible name. */
  readonly activeCount?: number;
  readonly className?: string;
};

/**
 * ONE row, above everything it scopes.
 *
 * Never inside a chart card and never per-chart: every table, stat, and chart
 * below re-renders against the same slice, so the numbers on screen always
 * agree with each other. A panel with its own window is a different dashboard,
 * which is also why MetricCard has no time-range control.
 *
 * ── The Phase 2 seam ──────────────────────────────────────────────────────────
 * §5.5 says every control here writes to typed URL search params, so any
 * filtered view is a link. That needs TanStack Router, which lands in Phase 2 —
 * so this takes plain `value`/`onChange` children today and Phase 2 swaps the
 * state source without touching this component. The composition rule is what
 * matters now; the storage is an implementation detail.
 */
export function FilterBar({
  label,
  children,
  onClear,
  clearLabel = 'Clear filters',
  activeCount = 0,
  className,
}: FilterBarProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        'border-rule bg-surface flex flex-wrap items-end gap-12 rounded-md border p-12',
        className,
      )}
    >
      {children}

      {onClear === undefined || activeCount === 0 ? null : (
        <Button className="ms-auto" icon={<X />} onClick={onClear} variant="ghost">
          {clearLabel}
          {/* The count is announced but not repeated visually — the chips
              already show what is on, and a number beside the button would
              restate them. */}
          <span className="sr-only"> ({activeCount})</span>
        </Button>
      )}
    </section>
  );
}
