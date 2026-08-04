import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';
import { IconButton } from '@/components/primitives/IconButton';
import { OVERLAY_SCRIM, OVERLAY_SURFACE } from '@/components/primitives/internal/overlay';
import { cn } from '@/lib/cn';

/**
 * The right-side peek drawer from §4 — "fast triage, preserves scroll and
 * filter state".
 *
 * Built on Radix Dialog rather than on anything drawer-specific, because it IS
 * a dialog: modal, focus-trapped, Esc-closing, focus-returning. Only the
 * geometry differs. Reaching for a second overlay implementation would mean
 * maintaining that contract twice.
 *
 * The list → detail pattern this serves has a full route as its counterpart, so
 * the drawer deliberately does not own a URL. Anything worth linking to belongs
 * on the detail route.
 */
export type DrawerProps = {
  readonly title: string;
  readonly description?: string;
  readonly trigger?: ReactElement;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly closeLabel: string;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
};

export function Drawer({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  closeLabel,
  footer,
  children,
  className,
}: DrawerProps) {
  return (
    <RadixDialog.Root
      {...(open !== undefined && { open })}
      {...(onOpenChange !== undefined && { onOpenChange })}
    >
      {trigger === undefined ? null : <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}

      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY_SCRIM} />

        <RadixDialog.Content
          className={cn(
            OVERLAY_SURFACE,
            // Slides in from the right; opacity-only under reduced motion, so
            // §5.4's "transforms are dropped" is honoured rather than merely
            // sped up past perception.
            'animate-slide-in-right motion-reduce:animate-fade-in',
            // Flush to the right edge, so only the left corners are rounded.
            'fixed inset-y-0 right-0 rounded-r-none border-y-0 border-r-0',
            'flex w-[min(28rem,calc(100vw-48px))] flex-col gap-16 p-24',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-16">
            <div className="flex flex-col gap-4">
              <RadixDialog.Title className="font-display text-ink text-xl font-semibold">
                {title}
              </RadixDialog.Title>
              {description === undefined ? null : (
                <RadixDialog.Description className="text-ink-secondary text-sm">
                  {description}
                </RadixDialog.Description>
              )}
            </div>

            <RadixDialog.Close asChild>
              <IconButton icon={<X />} label={closeLabel} />
            </RadixDialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

          {footer === undefined ? null : (
            <div className="flex flex-wrap justify-end gap-8">{footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
