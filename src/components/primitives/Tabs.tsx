import { Tabs as RadixTabs } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  readonly value: string;
  readonly label: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

export type TabsProps = {
  /** Names the tab list — "Restaurant sections", not "Tabs". */
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
  readonly className?: string;
};

/**
 * Tabs, drawn as a hairline rule with an underlined active tab.
 *
 * §5.1 principle 3 — structure from 1px rules, not nested boxes — so no pill
 * backgrounds and no bordered tab shapes. The active tab is marked by a 2px
 * gold underline AND a weight change, because an underline alone is a colour
 * signal once the gold is the only thing distinguishing it.
 *
 * `activationMode` stays Radix's default of "automatic": arrowing through tabs
 * shows each panel as focus lands. That is right for the Restaurant detail
 * screen's Overview/Menu/Staff split, where panels are already loaded — set it
 * manual only if a panel becomes expensive to render.
 */
export function Tabs({ label, items, value, defaultValue, onValueChange, className }: TabsProps) {
  return (
    <RadixTabs.Root
      className={cn('flex flex-col gap-16', className)}
      {...(value !== undefined && { value })}
      {...(defaultValue !== undefined && { defaultValue })}
      {...(onValueChange !== undefined && { onValueChange })}
    >
      <RadixTabs.List
        aria-label={label}
        // The rule runs the full width and the active tab sits on it, which is
        // what makes the underline read as a position rather than a decoration.
        className="border-rule flex gap-4 overflow-x-auto border-b"
      >
        {items.map(({ value: itemValue, label: itemLabel, disabled }) => (
          <RadixTabs.Trigger
            className={[
              'min-h-(--control-h) shrink-0 border-b-2 border-transparent px-12',
              'text-ink-secondary text-base text-nowrap',
              'transition-colors duration-120 ease-brand',
              'hover:text-ink focus-visible:focus-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              // Weight as well as colour: the underline is gold, and gold is
              // reserved for "this matters" rather than for status, so the
              // second channel keeps the state readable in forced colours too.
              'data-[state=active]:border-gold data-[state=active]:text-ink',
              'data-[state=active]:font-medium',
              'forced-colors:data-[state=active]:border-[Highlight]',
            ].join(' ')}
            disabled={disabled ?? false}
            key={itemValue}
            value={itemValue}
          >
            {itemLabel}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {items.map(({ value: itemValue, content }) => (
        <RadixTabs.Content
          className="focus-visible:focus-ring rounded-md outline-none"
          key={itemValue}
          value={itemValue}
        >
          {content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
