import { Tooltip as RadixTooltip } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';
import { OVERLAY_MOTION, OVERLAY_SURFACE } from '@/components/primitives/internal/overlay';
import { cn } from '@/lib/cn';

/**
 * Mount once, near the root. Radix shares hover timing across every tooltip
 * beneath it, so moving between two controls does not restart the delay.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={150}>
      {children}
    </RadixTooltip.Provider>
  );
}

export type TooltipProps = {
  readonly trigger: ReactElement;
  /** Supplementary text. NEVER the control's only label — see below. */
  readonly content: string;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly className?: string;
};

/**
 * Supplementary help, and nothing more.
 *
 * A tooltip must NEVER carry a control's only accessible name. It is
 * unreachable by touch, invisible to a keyboard user who never hovers, and
 * Radix wires it through `aria-describedby` rather than `aria-labelledby` — so
 * a control named only by its tooltip announces as "button". That is why
 * IconButton takes a required `label` prop instead of leaning on this.
 *
 * Use it for the second sentence: what a column means, why an action is
 * disabled, what a 64-hex hash belongs to.
 */
export function Tooltip({ trigger, content, side = 'top', className }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{trigger}</RadixTooltip.Trigger>

      <RadixTooltip.Portal>
        <RadixTooltip.Content
          className={cn(
            OVERLAY_SURFACE,
            OVERLAY_MOTION,
            // Deliberately capped and wrapping rather than a single line: at
            // +30% text expansion a nowrap tooltip runs off the viewport.
            'max-w-64 px-8 py-4 text-sm text-balance',
            className,
          )}
          side={side}
          sideOffset={4}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
