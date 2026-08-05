import { CircleCheck, Minus, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The three poles of §5.2's diverging scale. There is deliberately no amber. */
export type HealthBand = 'good' | 'neutral' | 'bad';

export type HealthMeterProps = {
  readonly label: string;
  readonly value: number;
  readonly max?: number;
  /**
   * Which band the value falls in.
   *
   * Supplied by the caller rather than computed here, because the thresholds
   * are DOMAIN knowledge and they invert between measures: cost % is good when
   * low (green <32%, neutral 33–40%, red >40% per `appendix/C_Wireframes.md`),
   * morale is good when high. A component that guessed would be wrong half the
   * time and silently.
   */
  readonly band: HealthBand;
  /** Drawn as a marker on the track — the 32% food-cost target, say. */
  readonly target?: number;
  /** Pre-formatted, and shown as the readout. */
  readonly valueLabel: string;
  /** Names the band in words: "under target". Required — see below. */
  readonly bandLabel: string;
  readonly targetLabel?: string;
  readonly className?: string;
};

/**
 * A value on §5.2's diverging scale.
 *
 * This is the component the amber decision was made FOR. Measured, every amber
 * candidate sits at ΔE 5.1–10.4 from brand gold — far below the floor of 15 —
 * so cost %, morale, and margin take a green↔gray↔red diverging scale with a
 * neutral midpoint instead, and gold stays reserved for brand and accent.
 *
 * Golden rule 9 is structural here rather than advisory: the band rides the
 * FILL and the GLYPH, and `bandLabel` states it in words. That is three
 * channels, none of which is colour alone — which matters most for the middle
 * band, since --polarity-neutral measures 3.40:1 dark / 3.64:1 light and may
 * never colour text.
 */
const BAND = {
  good: { fill: 'bg-good', ink: 'text-good', Icon: CircleCheck },
  neutral: { fill: 'bg-neutral', ink: 'text-ink-secondary', Icon: Minus },
  bad: { fill: 'bg-bad', ink: 'text-bad', Icon: TriangleAlert },
} as const;

export function HealthMeter({
  label,
  value,
  max = 100,
  band,
  target,
  valueLabel,
  bandLabel,
  targetLabel,
  className,
}: HealthMeterProps) {
  const percent = Math.min(Math.max(value / max, 0), 1) * 100;
  const { fill, ink, Icon } = BAND[band];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-8">
        <span className="text-ink-secondary text-sm">{label}</span>
        <span className="flex items-center gap-4">
          <Icon aria-hidden={true} className={cn('size-16 shrink-0', ink)} />
          <span className="text-ink tabular text-sm font-medium">{valueLabel}</span>
          {/*
            The band in WORDS. Without it the middle band is conveyed by a grey
            fill and a dash, which is the closest this design system gets to
            colour-alone — and grey is exactly the value an operator most needs
            spelled out.
          */}
          <span className="text-ink-secondary text-sm">{bandLabel}</span>
        </span>
      </div>

      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        aria-valuetext={`${valueLabel} — ${bandLabel}`}
        className="border-control-edge bg-raised relative h-8 w-full overflow-hidden rounded-full border"
        role="meter"
      >
        <div className={cn('h-full rounded-full', fill)} style={{ width: `${String(percent)}%` }} />

        {target === undefined ? null : (
          // The target is a hairline ON the track, not a second bar. A reader
          // needs "where should this be" in the same glance as "where is it",
          // and a separate marker row breaks that.
          <span
            aria-hidden={true}
            className="bg-ink absolute inset-y-0 w-px"
            style={{ left: `${String(Math.min(Math.max(target / max, 0), 1) * 100)}%` }}
          />
        )}
      </div>

      {targetLabel === undefined ? null : (
        <p className="text-ink-tertiary text-xs">{targetLabel}</p>
      )}
    </div>
  );
}
