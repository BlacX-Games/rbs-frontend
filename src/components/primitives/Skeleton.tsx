import { cn } from '@/lib/cn';

export type SkeletonProps = {
  /** Renders a stack of text-height bars, the last one short, as prose reads. */
  readonly lines?: number;
  readonly className?: string;
};

/**
 * `aria-hidden` throughout, deliberately.
 *
 * A skeleton is a picture of content that does not exist yet; announcing it
 * spells out a paragraph of nothing. The state belongs on the CONTAINER as
 * `aria-busy`, which is a pattern-level concern — stage 3's DataTable and
 * MetricCard own it, and no primitive can know it is the thing being waited on.
 *
 * Safe under prefers-reduced-motion, and it is worth knowing WHY rather than
 * trusting it: tokens.css forces `animation-iteration-count: 1` and a 1ms
 * duration, and Tailwind's `pulse` keyframe runs 1 → .5 → 1. One iteration
 * therefore lands back at full opacity. A keyframe ending at .5 would leave
 * every skeleton permanently half-faded for exactly the users who asked for
 * less motion — so do not swap the animation without checking its end state.
 */
export function Skeleton({ lines = 1, className }: SkeletonProps) {
  if (lines === 1) {
    return (
      <span
        aria-hidden={true}
        className={cn('bg-raised block h-16 animate-pulse rounded-sm', className)}
      />
    );
  }

  return (
    <span aria-hidden={true} className="flex flex-col gap-8">
      {Array.from({ length: lines }, (_, index) => (
        <span
          className={cn(
            'bg-raised block h-16 animate-pulse rounded-sm',
            // A ragged last line reads as prose rather than as a block, which
            // is the whole point of a skeleton over a plain grey box.
            index === lines - 1 ? 'w-2/3' : 'w-full',
            className,
          )}
          key={index}
        />
      ))}
    </span>
  );
}
