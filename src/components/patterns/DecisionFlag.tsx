import { CircleHelp } from 'lucide-react';
import { Tooltip } from '@/components/primitives/Tooltip';
import { cn } from '@/lib/cn';

export type DecisionFlagProps = {
  /**
   * What is unsettled, in words. Becomes the chip's accessible name, so it is
   * never just "[NEEDS DECISION]" with no subject.
   */
  readonly label: string;
  /** The open question, for the tooltip — why it is unresolved and what blocks it. */
  readonly detail: string;
  /** Deep-links the open-questions appendix entry. */
  readonly href?: string;
  readonly className?: string;
};

/**
 * The `[NEEDS DECISION]` marker, per golden rule 5.
 *
 * The rule is that a value carrying a doc status tag "renders with a visible
 * marker and is never presented as settled". Several figures the console
 * displays are proposals rather than canon — the §6.2 palette is still
 * unsigned, `Staff.role` is a free-text field the GDD never enumerates,
 * `guestEnergy` is ambiguous between input and output — and an operator reading
 * a screen has no way to tell which.
 *
 * Deliberately NOT a status tone. It is not good news or bad news; it is
 * "nobody has decided yet", which is a different axis entirely, so it takes
 * gold — the accent that means *this matters* — plus a glyph and a word.
 */
export function DecisionFlag({ label, detail, href, className }: DecisionFlagProps) {
  const chip = (
    <span
      className={cn(
        'border-gold/40 text-gold-text inline-flex items-center gap-4 rounded-sm border',
        'px-4 py-2 text-xs font-medium align-middle',
        className,
      )}
    >
      <CircleHelp aria-hidden={true} className="size-12 shrink-0" />
      {/*
        `text-gold-text`, not `text-gold`. On the paper theme the accent
        measures 3.06:1 — fine for a border or a large numeral, under the bar
        for body-size type — and this chip is deliberately small.
      */}
      Needs decision
      <span className="sr-only">: {label}</span>
    </span>
  );

  return (
    <Tooltip
      content={detail}
      trigger={
        href === undefined ? (
          // A `span` cannot be a tooltip trigger a keyboard reaches, so without
          // a link the chip carries its own tabIndex — otherwise the detail is
          // pointer-only, which is the tooltip failure mode this codebase
          // already documents.
          <span className="focus-visible:focus-ring rounded-sm" tabIndex={0}>
            {chip}
          </span>
        ) : (
          <a className="focus-visible:focus-ring rounded-sm" href={href}>
            {chip}
          </a>
        )
      }
    />
  );
}
