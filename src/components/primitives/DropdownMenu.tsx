import { Check } from 'lucide-react';
import { DropdownMenu as RadixDropdownMenu } from 'radix-ui';
import type { ComponentType, ReactElement } from 'react';
import {
  OVERLAY_ITEM,
  OVERLAY_MOTION,
  OVERLAY_SURFACE,
} from '@/components/primitives/internal/overlay';
import { cn } from '@/lib/cn';

type Glyph = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly Icon?: Glyph;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  /**
   * Renders in the danger tone AND with its glyph, per golden rule 9.
   *
   * Not a `tone` union like Badge's, because a menu has exactly one meaningful
   * variation — "this one destroys something" — and the destructive item is the
   * one place in a menu where colour alone would be a genuine hazard.
   */
  readonly destructive?: boolean;
  /** Renders a rule above this item. Grouping without a nested API. */
  readonly separatorBefore?: boolean;
}

export type DropdownMenuProps = {
  readonly trigger: ReactElement;
  /** Names the menu for assistive tech. */
  readonly label: string;
  readonly items: readonly MenuItem[];
  readonly align?: 'start' | 'center' | 'end';
  readonly className?: string;
};

export function DropdownMenu({
  trigger,
  label,
  items,
  align = 'end',
  className,
}: DropdownMenuProps) {
  return (
    <RadixDropdownMenu.Root>
      <RadixDropdownMenu.Trigger asChild>{trigger}</RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align={align}
          aria-label={label}
          className={cn(OVERLAY_SURFACE, OVERLAY_MOTION, 'min-w-56 p-4', className)}
          sideOffset={4}
        >
          {items.map(
            ({ id, label: itemLabel, Icon, onSelect, disabled, destructive, separatorBefore }) => (
              <div key={id}>
                {separatorBefore === true ? (
                  <RadixDropdownMenu.Separator className="bg-rule my-4 h-px" />
                ) : null}

                <RadixDropdownMenu.Item
                  className={cn(
                    OVERLAY_ITEM,
                    'cursor-default',
                    // The glyph carries the destructive meaning alongside the
                    // colour — golden rule 9 applies inside a menu exactly as it
                    // does on a Badge.
                    destructive === true && 'text-bad data-[highlighted]:text-bad',
                  )}
                  disabled={disabled ?? false}
                  onSelect={onSelect}
                >
                  {Icon === undefined ? null : (
                    <Icon aria-hidden={true} className="size-16 shrink-0" />
                  )}
                  {itemLabel}
                </RadixDropdownMenu.Item>
              </div>
            ),
          )}
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}

export interface CheckboxMenuItem {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}

/**
 * A menu of toggles — the column-visibility control every DataTable needs.
 *
 * Separate from DropdownMenu rather than a mode of it, because the roles differ:
 * these are `menuitemcheckbox` and they do not close the menu on select, which
 * is the behaviour someone toggling six columns actually wants.
 */
export function DropdownCheckboxMenu({
  trigger,
  label,
  items,
  align = 'end',
  className,
}: {
  readonly trigger: ReactElement;
  readonly label: string;
  readonly items: readonly CheckboxMenuItem[];
  readonly align?: 'start' | 'center' | 'end';
  readonly className?: string;
}) {
  return (
    <RadixDropdownMenu.Root>
      <RadixDropdownMenu.Trigger asChild>{trigger}</RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align={align}
          aria-label={label}
          className={cn(OVERLAY_SURFACE, OVERLAY_MOTION, 'min-w-56 p-4', className)}
          sideOffset={4}
        >
          {items.map(({ id, label: itemLabel, checked, onCheckedChange }) => (
            <RadixDropdownMenu.CheckboxItem
              checked={checked}
              className={cn(OVERLAY_ITEM, 'cursor-default')}
              key={id}
              onCheckedChange={onCheckedChange}
              // Kept open so a run of toggles is one interaction rather than
              // six round trips through the trigger.
              onSelect={(event) => {
                event.preventDefault();
              }}
            >
              <span className="grid size-16 shrink-0 place-items-center">
                <RadixDropdownMenu.ItemIndicator>
                  <Check aria-hidden={true} className="text-gold size-16" />
                </RadixDropdownMenu.ItemIndicator>
              </span>
              {itemLabel}
            </RadixDropdownMenu.CheckboxItem>
          ))}
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}
