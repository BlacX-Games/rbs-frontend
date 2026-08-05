import type { ComponentProps, ReactElement } from 'react';
import { CONTROL_BASE } from '@/components/primitives/internal/control';
import { cn } from '@/lib/cn';

const VARIANTS = {
  secondary: 'border-rule bg-surface text-ink border hover:bg-raised',
  ghost: 'text-ink-secondary hover:bg-raised hover:text-ink',
} as const;

export type IconButtonProps = ComponentProps<'button'> & {
  /**
   * The accessible name. REQUIRED — an icon-only control without one announces
   * as "button" and nothing else, which is the most common a11y defect in an
   * admin console. Rendered sr-only rather than as aria-label so it also
   * survives translation as ordinary text (§5.6).
   */
  readonly label: string;
  readonly icon: ReactElement;
  readonly variant?: keyof typeof VARIANTS;
};

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  className,
  type,
  ...rest
}: IconButtonProps) {
  return (
    <button
      // min-w as well as min-h: a square target. §5.6 wants 44×44 in
      // comfortable density and half of that is the axis everyone forgets —
      // a 44px-tall, 20px-wide icon button fails the same criterion.
      className={cn(
        CONTROL_BASE,
        'inline-grid min-w-(--control-h) place-items-center [&_svg]:size-16',
        VARIANTS[variant],
        className,
      )}
      type={type ?? 'button'}
      {...rest}
    >
      <span aria-hidden={true} className="contents">
        {icon}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
