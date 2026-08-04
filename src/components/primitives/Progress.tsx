import { Progress as RadixProgress } from 'radix-ui';
import { cn } from '@/lib/cn';

const THICKNESS = {
  4: 'h-4',
  8: 'h-8',
} as const;

export type ProgressProps = {
  readonly label: string;
  /** `null` is indeterminate — Radix then correctly omits `aria-valuenow`. */
  readonly value: number | null;
  readonly max?: number;
  readonly thickness?: keyof typeof THICKNESS;
  readonly className?: string;
};

export function Progress({ label, value, max = 100, thickness = 8, className }: ProgressProps) {
  // Clamped ONCE, and the clamped number is what both the bar and
  // `aria-valuenow` report. Passing an out-of-range value straight through
  // would announce "140 of 100" to a screen reader and make Radix log an
  // invalid-value error into the console that e2e's boots-clean check watches.
  const clamped = value === null ? null : Math.min(Math.max(value, 0), max);
  const percent = clamped === null ? 0 : (clamped / max) * 100;

  return (
    <RadixProgress.Root
      aria-label={label}
      className={cn(
        // The track carries a BORDER, not just a fill. --bg-raised measures
        // 1.07:1 dark / 1.02:1 light against the surface behind it — a bar
        // whose extent is invisible, so the fill has nothing to be read
        // against and "40% of what?" has no answer.
        'border-control-edge bg-raised relative w-full overflow-hidden rounded-full border',
        THICKNESS[thickness],
        className,
      )}
      max={max}
      value={clamped}
    >
      <RadixProgress.Indicator
        className={cn(
          'bg-gold h-full rounded-full transition-transform duration-180 ease-brand',
          // Indeterminate gets a pulse rather than a phantom position. Painting
          // a bar at 0 would claim "no progress", which is a measurement we do
          // not have.
          clamped === null && 'w-1/3 animate-pulse',
        )}
        style={clamped === null ? undefined : { width: `${String(percent)}%` }}
      />
    </RadixProgress.Root>
  );
}
