import { SCORE_TIERS, tierOf, type ScoreTier } from '@/components/patterns/internal/scale';
import { cn } from '@/lib/cn';

export type ScoreDialProps = {
  readonly label: string;
  /** 0–100. Reputation, satisfaction, DQS, CQS, ambience. */
  readonly value: number;
  /** Overrides the reputation bands where a measure uses different ones. */
  readonly tiers?: readonly ScoreTier[];
  readonly size?: 96 | 128;
  readonly className?: string;
};

/**
 * 0–100 with tier banding.
 *
 * The ramp is ORDINAL, not categorical: one gold hue at monotone lightness, so
 * the reader sees the order in the colour itself rather than having to learn
 * four arbitrary hues. Dark runs dark→light and paper runs light→dark, which is
 * why both ends stay legible against their own surface.
 *
 * The tier NAME is always rendered, and always in ordinary ink. The tier tokens
 * are fill-only — `--tier-new` measures 2.20:1 dark / 2.19:1 light — so setting
 * the label in its own tier colour would be unreadable at exactly the step a
 * new restaurant sits on.
 */
export function ScoreDial({
  label,
  value,
  tiers = SCORE_TIERS,
  size = 96,
  className,
}: ScoreDialProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const tier = tierOf(clamped, tiers);

  const stroke = 8;
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  // Three-quarters of the circle, so the gap reads as a dial rather than a
  // progress ring — and leaves room for the figure to sit optically centred.
  const sweep = 0.75;
  const arc = circumference * sweep;

  return (
    <div className={cn('inline-flex flex-col items-center gap-4', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          aria-label={label}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={clamped}
          aria-valuetext={`${String(clamped)} — ${tier.label}`}
          height={size}
          role="meter"
          // Rotated so the gap sits at the bottom.
          style={{ transform: 'rotate(135deg)' }}
          width={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke="var(--bg-raised)"
            strokeDasharray={`${String(arc)} ${String(circumference)}`}
            strokeLinecap="round"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke={tier.fill}
            strokeDasharray={`${String((arc * clamped) / 100)} ${String(circumference)}`}
            strokeLinecap="round"
            strokeWidth={stroke}
          />
        </svg>

        <span className="absolute inset-0 grid place-items-center">
          {/* Fraunces and proportional, matching StatTile — this is a hero
              figure in miniature, not a table cell. */}
          <span className="font-display text-ink text-xl font-semibold proportional-nums">
            {clamped}
          </span>
        </span>
      </div>

      <span className="text-ink-secondary text-xs">{label}</span>
      <span className="text-ink text-sm font-medium">{tier.label}</span>
    </div>
  );
}
