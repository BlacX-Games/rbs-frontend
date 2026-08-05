import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';
import { IconButton } from '@/components/primitives/IconButton';
import {
  OVERLAY_MOTION,
  OVERLAY_SCRIM,
  OVERLAY_SURFACE,
} from '@/components/primitives/internal/overlay';
import { cn } from '@/lib/cn';

export type DialogProps = {
  /**
   * REQUIRED, and not merely by convention — a dialog without an accessible
   * name announces as "dialog" and nothing else, which is the single most
   * common modal defect. Radix warns at runtime; making it a required prop
   * turns that warning into a compile error.
   */
  readonly title: string;
  /** Wired to `aria-describedby`, so a screen reader reads it on open. */
  readonly description?: string;
  /** The element that opens the dialog. Focus returns here on close. */
  readonly trigger?: ReactElement;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Accessible name for the ✕ button — user-visible text, so it is a prop. */
  readonly closeLabel: string;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
};

export function Dialog({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  closeLabel,
  footer,
  children,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root
      // Conditionally spread — Radix declares these without `| undefined`, and
      // exactOptionalPropertyTypes rejects an explicit one.
      {...(open !== undefined && { open })}
      {...(onOpenChange !== undefined && { onOpenChange })}
    >
      {trigger === undefined ? null : <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}

      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY_SCRIM} />

        {/*
          Radix gives the whole §5.6 overlay clause here for free, and each part
          is load-bearing: focus is trapped inside while open, Esc closes, and
          focus returns to the trigger on close. Reimplementing any of it by
          hand is how a modal ends up leaving focus stranded on a removed node,
          which drops the operator at the top of the document.
        */}
        <RadixDialog.Content
          className={cn(
            OVERLAY_SURFACE,
            OVERLAY_MOTION,
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            // Never a fixed height (§5.6). The viewport cap plus an internal
            // scroll means a long body at +30% text expansion scrolls rather
            // than overflowing off-screen.
            'flex max-h-[calc(100dvh-64px)] w-[calc(100vw-32px)] max-w-lg flex-col gap-16 p-24',
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

/**
 * Closes the surrounding Dialog. Wrap a footer Button with it.
 *
 * A component rather than a re-export of `RadixDialog.Close`: `asChild` is
 * always what a caller wants here, and baking it in means a footer action
 * cannot accidentally render a bare Radix button with none of our styling.
 */
export function DialogClose({ children }: { children: ReactElement }) {
  return <RadixDialog.Close asChild>{children}</RadixDialog.Close>;
}
