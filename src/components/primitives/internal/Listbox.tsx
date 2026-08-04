import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { OVERLAY_ITEM } from '@/components/primitives/internal/overlay';
import { cn } from '@/lib/cn';

/**
 * The listbox half of the ARIA combobox pattern.
 *
 * Presentational only — every piece of state arrives as a prop, so Combobox,
 * MultiSelect, and CommandPalette share one accessibility contract rather than
 * three near-identical ones.
 */

export function Listbox({
  id,
  label,
  children,
  className,
}: {
  readonly id: string;
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn('max-h-72 overflow-y-auto', className)}
      id={id}
      role="listbox"
    >
      {children}
    </ul>
  );
}

export function Option({
  id,
  active,
  selected,
  onSelect,
  onHover,
  children,
}: {
  readonly id: string;
  readonly active: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onHover: () => void;
  readonly children: ReactNode;
}) {
  return (
    <li
      aria-selected={selected}
      className={cn(OVERLAY_ITEM, 'cursor-default', active && 'bg-raised text-ink')}
      id={id}
      // Never focusable: focus belongs to the input for the whole interaction,
      // and `aria-activedescendant` is what tells a screen reader which option
      // is current. A tabIndex here would take the caret out of the field.
      onClick={onSelect}
      onMouseDown={(event) => {
        // Without this the mousedown blurs the input before the click lands,
        // which closes the popover and cancels the selection — the classic
        // "clicking an option does nothing" combobox bug.
        event.preventDefault();
      }}
      onMouseEnter={onHover}
      role="option"
    >
      {children}
      {selected ? <Check aria-hidden={true} className="text-gold ml-auto size-16" /> : null}
    </li>
  );
}

/**
 * What the listbox shows when a query matches nothing.
 *
 * `role="presentation"` so it is not counted as an option — an empty state
 * announced as "1 of 1" is worse than silence. The live region on the combobox
 * itself is what reports the count.
 */
export function EmptyOption({ children }: { readonly children: ReactNode }) {
  return (
    <li className="text-ink-secondary px-8 py-12 text-sm" role="presentation">
      {children}
    </li>
  );
}
