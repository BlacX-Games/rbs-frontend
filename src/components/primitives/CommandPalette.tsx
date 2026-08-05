import { Search } from 'lucide-react';
import { Dialog as RadixDialog, VisuallyHidden } from 'radix-ui';
import { useId, useState, type ComponentType, type KeyboardEvent } from 'react';
import { EmptyOption, Listbox, Option } from '@/components/primitives/internal/Listbox';
import {
  OVERLAY_MOTION,
  OVERLAY_SCRIM,
  OVERLAY_SURFACE,
} from '@/components/primitives/internal/overlay';
import { matchesQuery, useActiveOption } from '@/components/primitives/internal/useFilterableList';

type Glyph = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export interface Command {
  readonly id: string;
  readonly label: string;
  /** Groups commands under a heading — "Go to", "Balancing", "Ops". */
  readonly group: string;
  readonly Icon?: Glyph;
  /** Searched but not shown, so "restaurants" can find "Ops · Venues". */
  readonly keywords?: string;
  readonly onSelect: () => void;
}

export type CommandPaletteProps = {
  /** Names the dialog. Required, as for every Dialog. */
  readonly label: string;
  readonly placeholder: string;
  readonly emptyLabel: string;
  readonly commands: readonly Command[];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

/**
 * The ⌘K palette from §4.
 *
 * A modal Dialog rather than a Popover: it is the operator's whole attention
 * for the moment it is open, and it must be reachable from anywhere without a
 * trigger element existing on screen. That is also why `open` is REQUIRED and
 * controlled — the keyboard shortcut is the trigger, and it lives with whoever
 * owns the shell.
 *
 * Focus is moved into the input on open, unlike Combobox: there is no field
 * behind the dialog for it to have come from.
 */
export function CommandPalette({
  label,
  placeholder,
  emptyLabel,
  commands,
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const listId = useId();
  const [query, setQuery] = useState('');

  const matches = commands.filter((command) =>
    matchesQuery(query, command.label, command.group, command.keywords ?? ''),
  );
  const { activeIndex, setActiveIndex, move, moveTo } = useActiveOption({
    count: matches.length,
    resetKey: query,
  });

  const optionId = (index: number): string => `${listId}-option-${String(index)}`;

  /**
   * Every close goes through here, so the query is cleared exactly once and in
   * an event handler.
   *
   * An effect watching `open` would be the obvious shape and React 19's
   * set-state-in-effect rule rejects it — rightly: closing is an event, and
   * reacting to the state it produced is a frame late.
   */
  const close = (): void => {
    setQuery('');
    onOpenChange(false);
  };

  const run = (command: Command): void => {
    close();
    command.onSelect();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      moveTo(event.key === 'Home' ? 'first' : 'last');
      return;
    }

    if (event.key === 'Enter') {
      const active = matches[activeIndex];
      if (active === undefined) return;

      event.preventDefault();
      run(active);
    }
  };

  // Group headings are derived from the filtered set, so a group whose every
  // command was filtered out disappears rather than leaving an empty heading.
  const groups = [...new Set(matches.map((command) => command.group))];

  return (
    <RadixDialog.Root
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else close();
      }}
      open={open}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY_SCRIM} />

        <RadixDialog.Content
          className={[
            OVERLAY_SURFACE,
            OVERLAY_MOTION,
            'fixed top-96 left-1/2 -translate-x-1/2',
            'flex w-[min(36rem,calc(100vw-32px))] flex-col overflow-hidden',
          ].join(' ')}
        >
          {/*
            No `onOpenAutoFocus` override: Radix focuses the first tabbable
            node, and the search input is deliberately the first thing in the
            dialog. Anything added above it would need this revisited — a button
            there would silently steal the caret the palette exists to offer.
          */}
          {/*
            The palette shows no visible heading — the input placeholder is the
            affordance — but a dialog still owes an accessible name, and Radix
            warns without a Title.
          */}
          <VisuallyHidden.Root asChild>
            <RadixDialog.Title>{label}</RadixDialog.Title>
          </VisuallyHidden.Root>

          <div className="border-rule flex items-center gap-8 border-b px-16">
            <Search aria-hidden={true} className="text-ink-tertiary size-16 shrink-0" />
            <input
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={true}
              aria-label={label}
              autoComplete="off"
              className="min-h-(--control-h) flex-1 bg-transparent text-base outline-none"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              role="combobox"
              value={query}
            />
          </div>

          <Listbox className="max-h-96 p-4" id={listId} label={label}>
            {matches.length === 0 ? (
              <EmptyOption>{emptyLabel}</EmptyOption>
            ) : (
              groups.map((group) => (
                <li key={group} role="presentation">
                  <p className="text-ink-secondary px-8 py-4 text-xs font-medium tracking-[0.14em] uppercase">
                    {group}
                  </p>
                  <ul role="presentation">
                    {matches
                      .map((command, index) => ({ command, index }))
                      .filter((entry) => entry.command.group === group)
                      .map(({ command, index }) => (
                        <Option
                          active={index === activeIndex}
                          id={optionId(index)}
                          key={command.id}
                          onHover={() => {
                            setActiveIndex(index);
                          }}
                          onSelect={() => {
                            run(command);
                          }}
                          selected={false}
                        >
                          {command.Icon === undefined ? null : (
                            <command.Icon aria-hidden={true} className="size-16 shrink-0" />
                          )}
                          {command.label}
                        </Option>
                      ))}
                  </ul>
                </li>
              ))
            )}
          </Listbox>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
