import { Separator as RadixSeparator } from 'radix-ui';
import { cn } from '@/lib/cn';

export type SeparatorProps = {
  readonly orientation?: 'horizontal' | 'vertical';
  /**
   * `true` (the default) renders `role="none"`; `false` renders
   * `role="separator"`.
   *
   * Most rules are decoration and should say nothing — a screen reader
   * announcing "separator" between every pair of table sections is noise. Set
   * this to `false` only when the rule genuinely divides content into parts a
   * listener needs to know are distinct.
   */
  readonly decorative?: boolean;
  readonly className?: string;
};

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
}: SeparatorProps) {
  return (
    <RadixSeparator.Root
      className={cn(
        'bg-rule shrink-0',
        // §5.1 principle 3: structure comes from 1px rules, not from boxes.
        // This is that principle's literal implementation, and it keeps
        // --border-default rather than --control-edge because a rule is not a
        // control boundary and SC 1.4.11 does not reach it.
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      decorative={decorative}
      orientation={orientation}
    />
  );
}
