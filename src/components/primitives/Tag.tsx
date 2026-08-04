import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '@/components/primitives/IconButton';
import { TONE_GLYPH, type ToneProps } from '@/components/primitives/internal/control';
import { cn } from '@/lib/cn';

/**
 * A removable Tag IS a control, and is sized like one.
 *
 * `removeLabel` is required whenever `onRemove` is — the same union shape as
 * tone/icon. The `never` branch is what makes passing a label without a handler
 * an error too, so the two cannot drift apart.
 */
type RemovableProps =
  | { readonly onRemove: () => void; readonly removeLabel: string }
  | { readonly onRemove?: never; readonly removeLabel?: never };

export type TagProps = ToneProps &
  RemovableProps & {
    readonly children: ReactNode;
    readonly className?: string;
  };

export function Tag({
  tone = 'neutral',
  icon,
  onRemove,
  removeLabel,
  children,
  className,
}: TagProps) {
  const removable = onRemove !== undefined;

  return (
    <span
      className={cn(
        'border-rule bg-raised text-ink inline-flex items-center gap-4 rounded-sm border',
        'px-8 text-sm',
        // A tag carrying a remove button contains a real target, so the tag
        // takes the control height. Letting it stay chip-sized is exactly how a
        // 20px close affordance ships — the button would be the smallest thing
        // on the screen and the hardest to hit.
        removable ? 'min-h-(--control-h) py-2 pr-2' : 'py-2',
        className,
      )}
    >
      {icon === undefined ? null : (
        <span aria-hidden={true} className={cn('contents [&_svg]:size-16', TONE_GLYPH[tone])}>
          {icon}
        </span>
      )}

      {children}

      {removable ? (
        // A full-size IconButton, not a shrunken one. Overriding --control-h
        // here would be the single most tempting exception in the whole set —
        // and a 32px close button inside a filter chip is precisely the defect
        // §5.6's floor exists to prevent. The tag is wider for it; that is the
        // cost of the affordance being hittable.
        <IconButton icon={<X />} label={removeLabel} onClick={onRemove} />
      ) : null}
    </span>
  );
}
