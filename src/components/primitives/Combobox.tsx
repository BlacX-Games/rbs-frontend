import { ChevronDown } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';
import { useId, useState, type KeyboardEvent } from 'react';
import { Field } from '@/components/primitives/internal/Field';
import { EmptyOption, Listbox, Option } from '@/components/primitives/internal/Listbox';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { OVERLAY_MOTION, OVERLAY_SURFACE } from '@/components/primitives/internal/overlay';
import { useActiveOption, matchesQuery } from '@/components/primitives/internal/useFilterableList';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

export interface ComboboxItem {
  readonly value: string;
  readonly label: string;
  /** Extra text the filter searches but does not display — synonyms, ids. */
  readonly keywords?: string;
}

export type ComboboxProps = {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly items: readonly ComboboxItem[];
  readonly placeholder: string;
  /** Shown in the list when the query matches nothing. */
  readonly emptyLabel: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * The APG "editable combobox with list autocomplete", built by hand.
 *
 * Radix has no combobox, so this composes its Popover (portal, positioning,
 * dismissable layer) with our own listbox. The parts that are ours and easy to
 * get wrong:
 *
 *   • Focus NEVER leaves the input. `onOpenAutoFocus` is prevented, and the
 *     highlighted option is published through `aria-activedescendant` rather
 *     than by moving focus — otherwise the caret leaves the field mid-word.
 *   • `Popover.Anchor`, not `Popover.Trigger`. A trigger would make the input a
 *     toggle button and swallow the typing that is the whole point.
 */
export function Combobox({
  label,
  labelHidden,
  description,
  error,
  items,
  placeholder,
  emptyLabel,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
}: ComboboxProps) {
  const { id, labelId, descriptionId, errorId, describedBy } = useFieldIds({
    hasDescription: description !== undefined,
    hasError: error !== undefined,
  });
  const listId = useId();

  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const selected = isControlled ? value : uncontrolled;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedItem = items.find((item) => item.value === selected);
  const matches = items.filter((item) => matchesQuery(query, item.label, item.keywords ?? ''));
  const { activeIndex, setActiveIndex, move, moveTo } = useActiveOption({
    count: matches.length,
    resetKey: query,
  });

  const optionId = (index: number): string => `${listId}-option-${String(index)}`;

  const commit = (next: string): void => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
    setQuery('');
    setOpen(false);
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

    if (!open) return;

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      moveTo(event.key === 'Home' ? 'first' : 'last');
      return;
    }

    if (event.key === 'Enter') {
      const active = matches[activeIndex];
      if (active === undefined) return;

      // preventDefault only when something is actually selected, so Enter in an
      // empty list still submits the surrounding form rather than silently
      // doing nothing.
      event.preventDefault();
      commit(active.value);
    }
  };

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
              // The input shows the query while typing and the chosen label the
              // rest of the time. Binding it to the raw query would blank the
              // field the moment the popover closes.
              value={open ? query : (selectedItem?.label ?? '')}
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
            className={cn(OVERLAY_SURFACE, OVERLAY_MOTION, 'w-(--radix-popover-trigger-width) p-4')}
            onOpenAutoFocus={(event) => {
              // The whole pattern hinges on this. Radix would otherwise move
              // focus into the popover and the operator would be typing into
              // nothing.
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
                      commit(item.value);
                    }}
                    selected={item.value === selected}
                  >
                    {item.label}
                  </Option>
                ))
              )}
            </Listbox>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </Field>
  );
}
