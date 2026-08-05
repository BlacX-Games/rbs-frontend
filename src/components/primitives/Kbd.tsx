import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type KbdProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * A keyboard key, as `<kbd>`.
 *
 * The element is the point: `app.css` already routes `kbd` to --font-mono, and
 * a screen reader treats it as ordinary text, which is right — "press ⌘K"
 * should read as a sentence rather than as a widget.
 *
 * Not a control, so no --control-h. It sits inside prose and in the command
 * palette's hint row, and sizing it to 44px would wreck both.
 */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'border-rule bg-raised text-ink-secondary inline-flex items-center justify-center',
        'min-w-20 rounded-sm border px-4 py-2 text-xs',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
