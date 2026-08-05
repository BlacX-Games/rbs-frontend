import type { ReactNode } from 'react';
import { TONE_GLYPH, type ToneProps } from '@/components/primitives/internal/control';
import { cn } from '@/lib/cn';

export type BadgeProps = ToneProps & {
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * A status chip whose tone is carried by its GLYPH, never by its text.
 *
 * `ToneProps` is a discriminated union: any tone but `neutral` requires an
 * `icon`, so `<Badge tone="bad">Over target</Badge>` is a compile error. That
 * is golden rule 9 — "status is never colour alone" — enforced by the type
 * system rather than by a lint rule someone can disable inline.
 *
 * There is deliberately no `size` prop. A badge has to grow with its text at
 * +30% expansion (§5.6), and a fixed size is the thing that stops it.
 */
export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'border-rule bg-raised text-ink inline-flex items-center gap-4 rounded-sm border',
        'px-8 py-2 text-sm font-medium',
        className,
      )}
    >
      {icon === undefined ? null : (
        // The label stays --text-primary at every tone. Measured on --bg-raised,
        // `critical` is 3.66:1 on dark and `gold` is 3.51:1 on paper: both clear
        // the 3:1 gate for a graphical object and both FAIL the 4.5:1 gate for
        // text. Tinting the label would ship an unreadable badge in one theme.
        <span aria-hidden={true} className={cn('contents [&_svg]:size-16', TONE_GLYPH[tone])}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
