import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sparkline } from '@/components/charts/Sparkline';
import type { ChartPoint, SeriesSlot } from '@/components/charts/chart';
import { cn } from '@/lib/cn';

export interface StatDelta {
  /** Pre-formatted and signed — "+12.4%", "−320.00". */
  readonly value: string;
  readonly direction: 'up' | 'down' | 'flat';
  /** Names the comparison period: "vs previous 7 days". */
  readonly label: string;
}

export type StatTileProps = {
  /** Sentence case, no trailing colon. */
  readonly label: string;
  /**
   * PRE-FORMATTED, and a string rather than a number.
   *
   * Golden rule 10: money is a string end to end. A `number` here would force
   * every caller with a `Decimal(12,2)` to parse it just to display it, which
   * is the exact round-trip that loses precision — and this is the single most
   * likely place in the console for a currency figure to appear.
   */
  readonly value: string;
  readonly delta?: StatDelta;
  /**
   * Whether "up" is good for THIS measure. Revenue: true. Food-cost %: false.
   *
   * Required whenever a delta is shown, because direction alone does not carry
   * the meaning — a rising food-cost percentage is bad news drawn with the same
   * arrow as rising revenue.
   */
  readonly upIsGood?: boolean;
  readonly trend?: { readonly points: readonly ChartPoint[]; readonly summary: string };
  readonly trendSlot?: SeriesSlot;
  readonly footer?: ReactNode;
  readonly className?: string;
};

const DIRECTION_GLYPH = { up: ArrowUp, down: ArrowDown, flat: Minus } as const;

export function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  trend,
  trendSlot = 4,
  footer,
  className,
}: StatTileProps) {
  const Glyph = delta === undefined ? Minus : DIRECTION_GLYPH[delta.direction];

  /*
   * Polarity is direction × whether up is good, never direction alone.
   *
   * `flat` is deliberately neither: it takes ordinary ink rather than
   * --polarity-neutral, which measures 3.40:1 dark / 3.64:1 light and is a MARK
   * colour. Putting it on a body-size delta would fail WCAG in both themes.
   */
  const polarity =
    delta === undefined || delta.direction === 'flat'
      ? 'flat'
      : (delta.direction === 'up') === upIsGood
        ? 'good'
        : 'bad';

  const POLARITY_INK = {
    good: 'text-good',
    bad: 'text-bad',
    flat: 'text-ink-secondary',
  } as const;

  return (
    <div
      className={cn('border-rule bg-surface flex flex-col gap-8 rounded-md border p-16', className)}
    >
      <p className="text-ink-tertiary text-xs font-medium tracking-[0.14em] uppercase">{label}</p>

      <div className="flex flex-wrap items-end justify-between gap-12">
        {/*
          Fraunces at display size, with PROPORTIONAL figures.

          §5.3 chose the serif deliberately — it is the strongest signal that
          this is not a stock admin template — and `proportional-nums` undoes
          app.css's global tabular default, because equal-width digits make a
          standalone 38px number look loose. Tabular figures belong in columns,
          which is where ChartTable and DataTable use them.
        */}
        <p className="font-display text-ink text-3xl leading-none font-semibold proportional-nums">
          {value}
        </p>

        {trend === undefined ? null : (
          <Sparkline label={label} points={trend.points} slot={trendSlot} summary={trend.summary} />
        )}
      </div>

      {delta === undefined ? null : (
        <p className="flex flex-wrap items-center gap-4 text-sm">
          {/* Golden rule 9: the arrow is the non-colour channel. A delta shown
              in red alone is unreadable to the operators who most need it. */}
          <Glyph aria-hidden={true} className={cn('size-16 shrink-0', POLARITY_INK[polarity])} />
          <span className={cn('tabular font-medium', POLARITY_INK[polarity])}>{delta.value}</span>
          <span className="text-ink-secondary">{delta.label}</span>
        </p>
      )}

      {footer}
    </div>
  );
}
