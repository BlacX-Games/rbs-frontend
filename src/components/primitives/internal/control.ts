import type { ReactElement } from 'react';

/**
 * The class records and types more than one primitive shares.
 *
 * A `.ts`, not a `.tsx`, and that is load-bearing:
 * `react-refresh/only-export-components` errors on a `.tsx` that exports an
 * object const beside a component. Everything here is an object const.
 *
 * Records that only one primitive uses stay unexported in that primitive's own
 * file — a caller changes appearance through props, never by importing a class
 * string, so nothing here is part of the public surface.
 */

/**
 * Every interactive control, buttons and fields alike.
 *
 * `min-h-(--control-h)`, never `h-`. §5.6 asks for two things that look like
 * they conflict: a 44×44 floor in comfortable density, and "no fixed-height
 * text containers" with layouts that survive +30% text expansion. A fixed `h-44`
 * satisfies the first by violating the second — a German label or a browser at
 * 130% font size clips. `min-h` is the floor AND lets the box grow, which is
 * the only reading that honours both.
 *
 * Density does the rest: --control-h resolves 44px comfortable, 32px compact,
 * so the operator's own preference moves every control at once.
 */
export const CONTROL_BASE = [
  'min-h-(--control-h) rounded-md',
  'transition-colors duration-120 ease-brand',
  'focus-visible:focus-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
  /*
   * forced-colors: hand the control back to the system palette.
   *
   * Not belt-and-braces — without it the high-contrast pass FAILS. Chromium
   * forces `background-color` on a filled button but leaves a `color` that came
   * through a custom property, so `danger` rendered --danger-ink (#fffdf7) on a
   * forced white background: 1.01:1, which axe reports as a serious violation.
   *
   * The four variants flatten to one appearance here, and that is correct — in
   * a high-contrast theme the operator's chosen palette outranks ours, and
   * distinction comes from the label and the glyph.
   */
  'forced-colors:border forced-colors:border-[ButtonBorder]',
  'forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]',
].join(' ');

/** Buttons — CONTROL_BASE plus the parts only a pressable thing needs. */
export const CONTROL_SHELL = [
  CONTROL_BASE,
  'inline-flex items-center justify-center gap-8',
  'px-(--control-pad-x)',
  // text-nowrap closes the vertical axis of +30% expansion only; a fixed-width
  // toolbar still needs a scrolling container. Recorded in §9 of the plan.
  'text-base font-medium text-nowrap',
].join(' ');

/**
 * Text-entry fields — input, textarea, the select trigger.
 *
 * `border-control-edge`, not `border-rule`. On a form control the border IS the
 * affordance that identifies the component, so WCAG 2.2 SC 1.4.11 wants 3:1;
 * --border-default measures 1.39:1 dark / 1.33:1 light. Decorative rules keep
 * the hairline, so §5.1's "structure comes from 1px rules" is untouched — this
 * is the narrow exception where a border carries meaning rather than structure.
 *
 * No `shadow-N` alongside the border: on the light theme elevation IS a border
 * ring, so the two together render a double hairline.
 */
export const FIELD_SHELL = [
  CONTROL_BASE,
  'w-full px-(--control-pad-x) py-(--cell-pad-y)',
  'border border-control-edge bg-surface text-ink text-base',
  'placeholder:text-ink-tertiary',
  'aria-invalid:border-bad',
  // A field is not a button: Field/FieldText are the system pair for an input
  // surface, and they override CONTROL_BASE's ButtonFace above.
  'forced-colors:bg-[Field] forced-colors:text-[FieldText]',
].join(' ');

/**
 * Golden rule 9 — "status is never colour alone" — made unrepresentable.
 *
 * Any tone but neutral requires an icon, so `<Badge tone="bad" />` is a compile
 * error rather than a review comment. A lint rule can be silenced with a
 * disable comment; a type cannot.
 *
 * `ReactElement`, NOT `ReactNode`: ReactNode admits `null`, so `icon={null}`
 * would satisfy the type and defeat the whole rule. One character, real hole.
 */
export const TONES = ['neutral', 'good', 'bad', 'critical', 'gold'] as const;

export type Tone = (typeof TONES)[number];

export type ToneProps =
  | { readonly tone?: 'neutral'; readonly icon?: ReactElement }
  | { readonly tone: Exclude<Tone, 'neutral'>; readonly icon: ReactElement };

/**
 * Tone colours the GLYPH. The label is always ordinary ink.
 *
 * This is the house precedent — see the polarity note in `App.tsx` — and it is
 * the only arrangement that measures safe. On --bg-raised, `critical` is 3.66:1
 * on dark and `gold` is 3.51:1 on light: both clear the 3:1 gate for a
 * graphical object and both fail the 4.5:1 gate for text. Colouring the label
 * would ship an unreadable badge in one theme or the other.
 *
 * `neutral` deliberately takes --text-tertiary rather than --polarity-neutral.
 * The polarity midpoint means "at target" on a diverging scale; a badge with no
 * tone means nothing at all, and conflating the two would put a HealthMeter
 * reading on a plain label.
 */
export const TONE_GLYPH: Readonly<Record<Tone, string>> = {
  neutral: 'text-ink-tertiary',
  good: 'text-good',
  bad: 'text-bad',
  critical: 'text-status-critical',
  gold: 'text-gold',
};
