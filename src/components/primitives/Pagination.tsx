import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

export type PaginationProps = {
  /** Names the nav landmark. */
  readonly label: string;
  readonly previousLabel: string;
  readonly nextLabel: string;
  /**
   * The range readout, already formatted — "1–50 of 1,204".
   *
   * A string rather than `{ from, to, total }` numbers, because formatting them
   * is a locale decision (separators, the en-dash, the word "of") that belongs
   * to the Phase 2 message catalog, not to a primitive.
   */
  readonly rangeLabel: string;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly className?: string;
};

/**
 * Previous / Next and a range readout. Deliberately NOT numbered pages.
 *
 * The admin read plane is CURSOR-paginated (§8.4: `?cursor&limit`, returning
 * `{ items, nextCursor, total? }`), chosen because UUID v7 primary keys are
 * time-sortable so a cursor is stable under concurrent writes. A cursor cannot
 * express "jump to page 7" — there is no offset to jump to. Numbered page links
 * would be a control that looks like it works and cannot.
 *
 * If offset pagination ever arrives for a specific list, that is a different
 * component, not a mode of this one.
 */
export function Pagination({
  label,
  previousLabel,
  nextLabel,
  rangeLabel,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  className,
}: PaginationProps) {
  return (
    <nav
      aria-label={label}
      className={cn('flex flex-wrap items-center justify-between gap-16', className)}
    >
      {/*
        A live region: paging is an async result, and §5.6 asks for one on
        exactly those. Without it a screen-reader user presses Next and hears
        nothing — the table silently becomes different rows.

        `tabular` so the digits do not shuffle the surrounding layout as the
        range changes.
      */}
      <p aria-live="polite" className="text-ink-secondary tabular text-sm">
        {rangeLabel}
      </p>

      <div className="flex items-center gap-8">
        <Button disabled={!hasPrevious} icon={<ChevronLeft />} onClick={onPrevious}>
          {previousLabel}
        </Button>
        <Button disabled={!hasNext} onClick={onNext}>
          {nextLabel}
          <ChevronRight aria-hidden={true} className="size-16" />
        </Button>
      </div>
    </nav>
  );
}
