import { Check, ChevronDown } from 'lucide-react';
import { Select as RadixSelect } from 'radix-ui';
import type { ComponentType } from 'react';
import { Field } from '@/components/primitives/internal/Field';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

/**
 * Radix Select, styled to the console rather than to the OS.
 *
 * A native `<select>` would cost no jsdom stubs and no portal, but its option
 * list is drawn by the platform and cannot carry the ink/gold language — and
 * stage 2b's Combobox, MultiSelect, and CommandPalette all reuse this
 * trigger-and-content shape. Radix also supplies the two §5.6 clauses that are
 * tedious to get right by hand: Esc closes, and focus returns to the trigger.
 */

export interface SelectItem {
  readonly value: string;
  readonly label: string;
  /** Capitalised so it destructures straight into JSX, per the house idiom. */
  readonly Icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

export type SelectProps = {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly items: readonly SelectItem[];
  /** User-visible text, so it is a required prop rather than a default. */
  readonly placeholder: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

export function Select({
  label,
  labelHidden,
  description,
  error,
  items,
  placeholder,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
}: SelectProps) {
  const { id, descriptionId, errorId, describedBy } = useFieldIds({
    hasDescription: description !== undefined,
    hasError: error !== undefined,
  });

  return (
    <Field
      description={description}
      descriptionId={descriptionId}
      error={error}
      errorId={errorId}
      id={id}
      label={label}
      labelHidden={labelHidden}
    >
      <RadixSelect.Root
        disabled={disabled}
        // Conditionally spread, never passed as a plain optional prop. Radix
        // declares `value: string` without `| undefined`, so under
        // exactOptionalPropertyTypes `value={value}` is a TS2375 error — and
        // widening OUR prop does not help, because the strict side is theirs.
        {...(value !== undefined && { value })}
        {...(defaultValue !== undefined && { defaultValue })}
        {...(onValueChange !== undefined && { onValueChange })}
      >
        <RadixSelect.Trigger
          aria-describedby={describedBy}
          aria-invalid={error !== undefined || undefined}
          className={cn(
            FIELD_SHELL,
            'flex items-center justify-between gap-8 text-left',
            className,
          )}
          id={id}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon asChild>
            <ChevronDown aria-hidden={true} className="text-ink-tertiary size-16 shrink-0" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className={[
              'border-rule bg-overlay text-ink z-50 overflow-hidden rounded-md border shadow-3',
              // forced-colors: a portalled popup that paints its own background
              // vanishes into the system colours otherwise. `Canvas`/`CanvasText`
              // are the system keywords, which is why they are not tokens.
              'forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]',
            ].join(' ')}
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-4">
              {items.map(({ value: itemValue, label: itemLabel, Icon }) => (
                <RadixSelect.Item
                  className={[
                    'flex items-center gap-8 rounded-sm px-8 py-8',
                    'min-h-(--control-h) text-base',
                    'cursor-default outline-none select-none',
                    'data-[highlighted]:bg-raised data-[highlighted]:text-ink',
                    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                  ].join(' ')}
                  key={itemValue}
                  value={itemValue}
                >
                  {Icon ? <Icon aria-hidden={true} className="size-16 shrink-0" /> : null}
                  <RadixSelect.ItemText>{itemLabel}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="ml-auto">
                    <Check aria-hidden={true} className="text-gold size-16" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </Field>
  );
}
