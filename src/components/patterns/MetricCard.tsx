import type { ReactNode } from 'react';
import { StatTile, type StatDelta } from '@/components/patterns/StatTile';
import { cn } from '@/lib/cn';

export type MetricCardProps = {
  readonly label: string;
  /** Pre-formatted — see StatTile on why money never arrives as a number. */
  readonly value: string;
  readonly delta?: StatDelta;
  readonly upIsGood?: boolean;
  /** A chart from `components/charts`, already carrying its own table toggle. */
  readonly chart: ReactNode;
  readonly className?: string;
};

/**
 * A StatTile with a chart under it.
 *
 * §5.5 defines this as "StatTile + chart + time-range control", and the
 * time-range control is deliberately ABSENT. Filters belong in one row above
 * everything they scope, so every panel re-renders against the same slice — two
 * Insights cards silently showing different periods is exactly the failure
 * §6.4's "as of" stamp exists to prevent, and an operator comparing food-cost %
 * against margin needs them on one window by construction.
 *
 * FilterBar owns the range. If a single panel genuinely needs its own window,
 * that is a different dashboard, not a prop.
 */
export function MetricCard({
  label,
  value,
  delta,
  upIsGood = true,
  chart,
  className,
}: MetricCardProps) {
  return (
    <div className={cn('flex flex-col gap-12', className)}>
      <StatTile
        label={label}
        upIsGood={upIsGood}
        value={value}
        {...(delta !== undefined && { delta })}
      />
      {/*
        The chart brings its own ChartFrame, so it already has a title, a legend
        where one is owed, and the mandatory table toggle. Wrapping it in a
        second card would double the border and the heading.
      */}
      {chart}
    </div>
  );
}
