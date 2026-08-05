import { Popover as RadixPopover } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';
import { OVERLAY_MOTION, OVERLAY_SURFACE } from '@/components/primitives/internal/overlay';
import { cn } from '@/lib/cn';

export type PopoverProps = {
  readonly trigger: ReactElement;
  /**
   * Names the popover for assistive tech. Required: a non-modal surface that
   * announces as an unlabelled group leaves a screen-reader user with no idea
   * what just opened.
   */
  readonly label: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Non-modal by design, unlike Dialog.
 *
 * A popover does not trap focus and does not scrim the page: it is for a filter
 * control or a detail hover-card, where an operator may well want to keep
 * reading the table underneath. Esc still closes it and focus still returns to
 * the trigger, which is the half of §5.6's clause that always applies.
 *
 * Anything that must be answered before work continues is a Dialog.
 */
export function Popover({
  trigger,
  label,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  children,
  className,
}: PopoverProps) {
  return (
    <RadixPopover.Root
      {...(open !== undefined && { open })}
      {...(onOpenChange !== undefined && { onOpenChange })}
    >
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          aria-label={label}
          className={cn(OVERLAY_SURFACE, OVERLAY_MOTION, 'w-72 p-16', className)}
          side={side}
          sideOffset={4}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
