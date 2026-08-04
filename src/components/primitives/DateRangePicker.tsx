import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton } from '@/components/primitives/IconButton';
import { Field } from '@/components/primitives/internal/Field';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  compareIso,
  formatDay,
  formatMonth,
  fromParts,
  isWithin,
  parseIso,
  weekdayLabels,
  type IsoDate,
  type WeekStart,
} from '@/components/primitives/internal/calendar';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { OVERLAY_MOTION, OVERLAY_SURFACE } from '@/components/primitives/internal/overlay';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

export interface DateRange {
  readonly start: IsoDate;
  readonly end: IsoDate;
}

export type DateRangePickerProps = {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly placeholder: string;
  readonly previousMonthLabel: string;
  readonly nextMonthLabel: string;
  readonly value?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly onValueChange?: (next: DateRange | null) => void;
  /** BCP-47. Drives month names, weekday headings, and the trigger's summary. */
  readonly locale?: string;
  /**
   * 1 = Monday (ISO-8601), the default. Not derived from the locale because
   * `Intl.Locale.prototype.getWeekInfo` is not available everywhere yet;
   * per-locale detection is a deliberate follow-up rather than a guess.
   */
  readonly weekStartsOn?: WeekStart;
  /** Injectable so tests are not time-dependent. */
  readonly today?: IsoDate;
  readonly min?: IsoDate;
  readonly max?: IsoDate;
  readonly disabled?: boolean;
  readonly className?: string;
};

function todayIso(): IsoDate {
  const now = new Date();

  // Local getters on purpose: "today" is the operator's today. It becomes ISO
  // parts immediately and never travels as a Date — see calendar.ts.
  return fromParts({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

/**
 * A two-click date range on the ARIA grid pattern, hand-built on `Intl`.
 *
 * No date library. The console needs month arithmetic, a six-week grid, and
 * localized names — all of which `Intl` and `calendar.ts` already give — and
 * §1.4's reasoning for authoring the component layer rather than inheriting one
 * applies here more than anywhere: a calendar is the most visible surface in a
 * filter bar.
 */
export function DateRangePicker({
  label,
  labelHidden,
  description,
  error,
  placeholder,
  previousMonthLabel,
  nextMonthLabel,
  value,
  defaultValue,
  onValueChange,
  locale = 'en-GB',
  weekStartsOn = 1,
  today = todayIso(),
  min,
  max,
  disabled = false,
  className,
}: DateRangePickerProps) {
  const { id, labelId, descriptionId, errorId, describedBy } = useFieldIds({
    hasDescription: description !== undefined,
    hasError: error !== undefined,
  });
  const monthLabelId = useId();
  const summaryId = useId();
  const gridRef = useRef<HTMLDivElement>(null);

  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<DateRange | null>(defaultValue ?? null);
  const range = isControlled ? value : uncontrolled;

  const [open, setOpen] = useState(false);
  const [focusedDate, setFocusedDate] = useState<IsoDate>(range?.start ?? today);
  /** The first click of a range in progress; `null` when the range is settled. */
  const [pending, setPending] = useState<IsoDate | null>(null);
  const shouldRestoreFocus = useRef(false);

  const { year, month } = parseIso(focusedDate);
  const weeks = buildMonthGrid(year, month, weekStartsOn);

  useEffect(() => {
    // Only after a key moved the day — otherwise this would steal focus on
    // every render, including the one that opens the popover.
    if (!shouldRestoreFocus.current) return;
    shouldRestoreFocus.current = false;

    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focusedDate}"]`)?.focus();
  }, [focusedDate]);

  const isDisabledDay = (day: IsoDate): boolean =>
    (min !== undefined && compareIso(day, min) < 0) ||
    (max !== undefined && compareIso(day, max) > 0);

  const commit = (next: DateRange | null): void => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  const pick = (day: IsoDate): void => {
    if (isDisabledDay(day)) return;

    if (pending === null) {
      // First click starts a new range. Clearing the committed value here is
      // what makes the in-progress selection legible — leaving the old range
      // painted while picking a new one reads as two ranges at once.
      setPending(day);
      commit(null);
      return;
    }

    // Normalised, because the second click is often before the first.
    const [start, end] = compareIso(pending, day) <= 0 ? [pending, day] : [day, pending];
    setPending(null);
    commit({ start, end });
  };

  const moveFocus = (next: IsoDate): void => {
    shouldRestoreFocus.current = true;
    setFocusedDate(next);
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const moves: Readonly<Record<string, IsoDate | undefined>> = {
      ArrowLeft: addDays(focusedDate, -1),
      ArrowRight: addDays(focusedDate, 1),
      ArrowUp: addDays(focusedDate, -7),
      ArrowDown: addDays(focusedDate, 7),
      Home: addDays(
        focusedDate,
        -((new Date(`${focusedDate}T00:00:00Z`).getUTCDay() - weekStartsOn + 7) % 7),
      ),
      End: addDays(
        focusedDate,
        6 - ((new Date(`${focusedDate}T00:00:00Z`).getUTCDay() - weekStartsOn + 7) % 7),
      ),
      PageUp: addMonths(focusedDate, event.shiftKey ? -12 : -1),
      PageDown: addMonths(focusedDate, event.shiftKey ? 12 : 1),
    };

    const next = moves[event.key];
    if (next !== undefined) {
      // Every branch preventDefaults: arrows would scroll the popover and
      // PageUp/PageDown would scroll the page out from under the calendar.
      event.preventDefault();
      moveFocus(next);
    }
  };

  const summary =
    range === null
      ? placeholder
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(
          new Date(`${range.start}T00:00:00Z`),
          new Date(`${range.end}T00:00:00Z`),
        );

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
        <RadixPopover.Trigger asChild>
          <button
            aria-describedby={describedBy}
            aria-invalid={error !== undefined || undefined}
            /*
              Named by the label AND the summary, in that order.
              A `<label for>` overrides a button's text content entirely, so
              without this the trigger announces as "Session dates, button" and
              the chosen range — the only thing that changes — is never spoken.
              The label keeps its `for` so clicking it still focuses the button.
            */
            aria-labelledby={`${labelId} ${summaryId}`}
            className={cn(
              FIELD_SHELL,
              'flex items-center justify-between gap-8 text-left',
              className,
            )}
            disabled={disabled}
            id={id}
            type="button"
          >
            <span className={range === null ? 'text-ink-tertiary' : undefined} id={summaryId}>
              {summary}
            </span>
            <CalendarDays aria-hidden={true} className="text-ink-tertiary size-16 shrink-0" />
          </button>
        </RadixPopover.Trigger>

        <RadixPopover.Portal>
          <RadixPopover.Content
            align="start"
            className={cn(OVERLAY_SURFACE, OVERLAY_MOTION, 'p-16')}
            sideOffset={4}
          >
            <div className="flex flex-col gap-12">
              <div className="flex items-center justify-between gap-8">
                <IconButton
                  icon={<ChevronLeft />}
                  label={previousMonthLabel}
                  onClick={() => {
                    setFocusedDate(addMonths(focusedDate, -1));
                  }}
                />
                {/* aria-live so paging the month is announced — otherwise the
                    grid silently becomes a different month. */}
                <p aria-live="polite" className="text-ink text-base font-medium" id={monthLabelId}>
                  {formatMonth(focusedDate, locale)}
                </p>
                <IconButton
                  icon={<ChevronRight />}
                  label={nextMonthLabel}
                  onClick={() => {
                    setFocusedDate(addMonths(focusedDate, 1));
                  }}
                />
              </div>

              {/*
                Divs with explicit grid roles rather than a <table>. role="grid"
                overrides table semantics anyway, and it keeps the calendar out
                of the way of the `tbody tr` locator the density e2e uses.
              */}
              <div
                aria-labelledby={monthLabelId}
                className="flex flex-col"
                onKeyDown={handleGridKeyDown}
                ref={gridRef}
                role="grid"
              >
                <div className="flex" role="row">
                  {weekdayLabels(locale, weekStartsOn).map((weekday) => (
                    <span
                      className="text-ink-secondary grid min-w-(--control-h) flex-1 place-items-center py-4 text-xs font-medium"
                      key={weekday}
                      role="columnheader"
                    >
                      {weekday}
                    </span>
                  ))}
                </div>

                {weeks.map((week) => (
                  <div className="flex" key={week[0]} role="row">
                    {week.map((day) => {
                      const outside = parseIso(day).month !== month;
                      const isEnd = range !== null && (day === range.start || day === range.end);
                      const inRange = range !== null && isWithin(day, range.start, range.end);
                      const isPending = day === pending;
                      const dayDisabled = isDisabledDay(day);

                      return (
                        <div
                          // `aria-selected` lives on the GRIDCELL, not on the
                          // button inside it. The attribute is only valid on
                          // option/row/tab/gridcell and friends — axe reports
                          // `aria-allowed-attr` for a button carrying it, which
                          // is how this was caught.
                          aria-selected={isEnd || isPending}
                          className="flex-1"
                          key={day}
                          role="gridcell"
                        >
                          <button
                            aria-current={day === today ? 'date' : undefined}
                            aria-disabled={dayDisabled || undefined}
                            // The full date, spoken. "4" alone tells a screen
                            // reader user nothing about which month they are in.
                            aria-label={formatDay(day, locale)}
                            className={cn(
                              'grid min-h-(--control-h) w-full place-items-center rounded-sm text-base',
                              'transition-colors duration-120 ease-brand',
                              'focus-visible:focus-ring',
                              outside && 'text-ink-secondary',
                              dayDisabled && 'cursor-not-allowed opacity-50',
                              !dayDisabled && !isEnd && 'hover:bg-raised',
                              inRange && !isEnd && 'bg-gold/20',
                              (isEnd || isPending) && 'bg-gold text-gold-ink font-medium',
                              // Today is marked by a ring as well as by
                              // aria-current, so it survives a range fill.
                              day === today && !isEnd && 'ring-gold ring-1 ring-inset',
                            )}
                            data-date={day}
                            onClick={() => {
                              pick(day);
                            }}
                            // Roving tabindex: exactly one day is tabbable, so
                            // the grid costs one Tab to enter and one to leave
                            // rather than forty-two.
                            tabIndex={day === focusedDate ? 0 : -1}
                            type="button"
                          >
                            {parseIso(day).day}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </Field>
  );
}
