import { Avatar as RadixAvatar } from 'radix-ui';
import { cn } from '@/lib/cn';

/**
 * Literal pixels, not `sm | md | lg`.
 *
 * `--spacing` is 1px, so the whole codebase already speaks in pixels — `size-32`
 * IS thirty-two pixels. A t-shirt scale here would be a second vocabulary for
 * the same idea, and 44 is meaningful in a way "lg" is not: it is the row
 * height, so an avatar in a comfortable-density table lines up by construction.
 */
const SIZES = {
  24: 'size-24 text-xs',
  32: 'size-32 text-sm',
  44: 'size-44 text-base',
} as const;

export type AvatarProps = {
  /** Drives both the accessible name and the initials fallback. */
  readonly name: string;
  readonly src?: string;
  readonly size?: keyof typeof SIZES;
  readonly className?: string;
};

/** First letters of the first and last words — "Danny R." becomes "DR". */
function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words.at(0)?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';

  return `${first}${last}`.toUpperCase();
}

export function Avatar({ name, src, size = 32, className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'border-rule bg-raised inline-flex shrink-0 items-center justify-center overflow-hidden',
        'rounded-full border align-middle',
        SIZES[size],
        className,
      )}
      // The name lives on the ROOT, not on the image. With alt="" below, the
      // photo is decorative and the name is announced exactly once whether the
      // image loads, fails, or was never provided.
      role="img"
      aria-label={name}
    >
      {src === undefined ? null : (
        <RadixAvatar.Image alt="" className="size-full object-cover" src={src} />
      )}
      {/*
        `delayMs` is OMITTED, which is not the same as `delayMs={0}`. Radix
        seeds its render flag from `delayMs === undefined`, so passing 0 starts
        the fallback hidden and reveals it a macrotask later — a table of two
        hundred staff rows would blink empty circles on every paint. Omitting
        the prop renders the initials on the first pass.
      */}
      <RadixAvatar.Fallback className="text-ink-secondary font-medium">
        {initialsOf(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
