import { AlertDialog } from 'radix-ui';
import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '@/components/primitives/Button';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import {
  OVERLAY_MOTION,
  OVERLAY_SCRIM,
  OVERLAY_SURFACE,
} from '@/components/primitives/internal/overlay';
import { cn } from '@/lib/cn';

export type ConfirmDialogProps = {
  readonly title: string;
  readonly description: string;
  readonly trigger?: ReactElement;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * The literal that must be typed EXACTLY before the action unlocks.
   *
   * Mirrors the backend's own `confirm: "DELETE"` body field, so the same word
   * guards both ends and an operator learns one ritual rather than two.
   */
  readonly confirmWord: string;
  /** Names the field: "Type DELETE to confirm". */
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly actionLabel: string;
  readonly onConfirm: () => void;
  /** Shown above the input — the cascade count, the version being replaced. */
  readonly consequence?: ReactNode;
  readonly className?: string;
};

/**
 * Typed-literal confirmation, per golden rule 8.
 *
 * GDPR deletion, balancing publish, and catalog delete all require typing an
 * exact word. That is not friction for its own sake: these actions cascade
 * across tables and cannot be undone from the console, and a confirm button
 * alone is one mis-aimed click from an irreversible one.
 *
 * `AlertDialog` rather than `Dialog`. Radix gives it `role="alertdialog"`, which
 * tells a screen reader this interrupts for a reason, and it deliberately does
 * NOT close on an outside click — only Cancel or Esc, so the ritual cannot be
 * dismissed by accident.
 */
export function ConfirmDialog({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  confirmWord,
  confirmLabel,
  cancelLabel,
  actionLabel,
  onConfirm,
  consequence,
  className,
}: ConfirmDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');

  // Exact. Not trimmed, not case-folded — the whole point is that the operator
  // reproduced the word deliberately.
  const unlocked = typed === confirmWord;

  return (
    <AlertDialog.Root
      onOpenChange={(next) => {
        // Cleared on every close, so reopening never arrives pre-armed from a
        // previous attempt the operator abandoned.
        if (!next) setTyped('');
        onOpenChange?.(next);
      }}
      {...(open !== undefined && { open })}
    >
      {trigger === undefined ? null : <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}

      <AlertDialog.Portal>
        <AlertDialog.Overlay className={OVERLAY_SCRIM} />

        <AlertDialog.Content
          className={cn(
            OVERLAY_SURFACE,
            OVERLAY_MOTION,
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'flex w-[calc(100vw-32px)] max-w-md flex-col gap-16 p-24',
            className,
          )}
        >
          <div className="flex flex-col gap-4">
            <AlertDialog.Title className="font-display text-ink text-xl font-semibold">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-ink-secondary text-sm">
              {description}
            </AlertDialog.Description>
          </div>

          {/* The consequence goes ABOVE the input. §6.1 wants the cascade count
              surfaced before the operator commits, not beside the button they
              are already reaching for. */}
          {consequence}

          <div className="flex flex-col gap-4">
            <label className="text-ink text-sm font-medium" htmlFor={inputId}>
              {confirmLabel}
            </label>
            <input
              autoComplete="off"
              className={cn(FIELD_SHELL)}
              id={inputId}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              value={typed}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-8">
            <AlertDialog.Cancel asChild>
              <Button>{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button disabled={!unlocked} onClick={onConfirm} variant="danger">
                {actionLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
