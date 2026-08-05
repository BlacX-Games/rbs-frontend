import { ChevronDown } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';
import { useId, useState, type KeyboardEvent } from 'react';
import { Tag } from '@/components/primitives/Tag';
import { Field } from '@/components/primitives/internal/Field';
import { EmptyOption, Listbox, Option } from '@/components/primitives/internal/Listbox';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { OVERLAY_MOTION, OVERLAY_SURFACE } from '@/components/primitives/internal/overlay';
import { matchesQuery, useActiveOption } from '@/components/primitives/internal/useFilterableList';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

export interface MultiSelectItem {
  readonly value: string;
  readonly label: string;
  readonly keywords?: string;
}

export type MultiSelectProps = {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly items: readonly MultiSelectItem[];
  readonly placeholder: string;
  readonly emptyLabel: string;
  /**
   * Builds the accessible name of each Tag's remove button, e.g.
   * `(label) => \`Remove ${label}\``. A function rather than a string because
   * the label has to name WHICH tag — eight buttons all called "Remove" are
   * indistinguishable in a screen reader's list.
   */
  readonly removeLabel: (itemLabel: string) => string;
  readonly value?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly onValueChange?: (next: readonly string[]) => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * A Combobox that keeps its selections, rendered as removable Tags.
 *
 * The list stays OPEN on select, unlike Combobox — someone tagging a dish with
 * four cuisines wants one interaction, not four round trips through the field.
 * Selected options keep `aria-selected` and stay in the list so they can be
 * toggled back off from the keyboard.
 */
export function MultiSelect({
  label,
  labelHidden,
  description,
  error,
  items,
  placeholder,
  emptyLabel,
  removeLabel,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
}: MultiSelectProps) {
  const { id, labelId, descriptionId, errorId, describedBy } = useFieldIds({
    hasDescription: description !== undefined,
    hasError: error !== undefined,
  });
  const listId = useId();

  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<readonly string[]>(defaultValue ?? []);
  const selected = isControlled ? value : uncontrolled;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = items.filter((item) => matchesQuery(query, item.label, item.keywords ?? ''));
  const { activeIndex, setActiveIndex, move, moveTo } = useActiveOption({
    count: matches.length,
    resetKey: query,
  });

  const optionId = (index: number): string => `${listId}-option-${String(index)}`;

  const commit = (next: readonly string[]): void => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  const toggle = (itemValue: string): void => {
    commit(
      selected.includes(itemValue)
        ? selected.filter((current) => current !== itemValue)
        : [...selected, itemValue],
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Backspace' && query === '' && selected.length > 0) {
      // Removes the last tag, the way every tag field an operator has used
      // before behaves. Guarded on an empty query so it never eats a character
      // they were mid-way through deleting.
      commit(selected.slice(0, -1));
      return;
    }

    if (!open) return;

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      moveTo(event.key === 'Home' ? 'first' : 'last');
      return;
    }

    if (event.key === 'Enter') {
      const active = matches[activeIndex];
      if (active === undefined) return;

      event.preventDefault();
      toggle(active.value);
      setQuery('');
    }
  };

  const selectedItems = selected
    .map((itemValue) => items.find((item) => item.value === itemValue))
    .filter((item) => item !== undefined);

  return (
    <Field
      description={description}
      descriptionId={descriptionId}
      error={error}
      errorId={errorId}
      id={id}
      label={label}
      labelHidden={labelHidden}
      labelId={labelId}
    >
      <div className="flex flex-col gap-8">
        {selectedItems.length === 0 ? null : (
          <ul className="flex flex-wrap gap-4">
            {selectedItems.map((item) => (
              <li key={item.value}>
                <Tag
                  onRemove={() => {
                    toggle(item.value);
                  }}
                  removeLabel={removeLabel(item.label)}
                >
                  {item.label}
                </Tag>
              </li>
            ))}
          </ul>
        )}

        <RadixPopover.Root onOpenChange={setOpen} open={open}>
          <RadixPopover.Anchor asChild>
            <div className="relative">
              <input
                aria-activedescendant={activeIndex >= 0 && open ? optionId(activeIndex) : undefined}
                aria-autocomplete="list"
                aria-controls={open ? listId : undefined}
                aria-describedby={describedBy}
                aria-expanded={open}
                aria-invalid={error !== undefined || undefined}
                autoComplete="off"
                className={cn(FIELD_SHELL, 'pr-40', className)}
                disabled={disabled}
                id={id}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                onClick={() => {
                  setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                role="combobox"
                value={query}
              />
              <ChevronDown
                aria-hidden={true}
                className="text-ink-tertiary pointer-events-none absolute top-1/2 right-12 size-16 -translate-y-1/2"
              />
            </div>
          </RadixPopover.Anchor>

          <RadixPopover.Portal>
            <RadixPopover.Content
              align="start"
              className={cn(
                OVERLAY_SURFACE,
                OVERLAY_MOTION,
                'w-(--radix-popover-trigger-width) p-4',
              )}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
              }}
              sideOffset={4}
            >
              <Listbox id={listId} label={label}>
                {matches.length === 0 ? (
                  <EmptyOption>{emptyLabel}</EmptyOption>
                ) : (
                  matches.map((item, index) => (
                    <Option
                      active={index === activeIndex}
                      id={optionId(index)}
                      key={item.value}
                      onHover={() => {
                        setActiveIndex(index);
                      }}
                      onSelect={() => {
                        toggle(item.value);
                      }}
                      selected={selected.includes(item.value)}
                    >
                      {item.label}
                    </Option>
                  ))
                )}
              </Listbox>
            </RadixPopover.Content>
          </RadixPopover.Portal>
        </RadixPopover.Root>
      </div>
    </Field>
  );
}
