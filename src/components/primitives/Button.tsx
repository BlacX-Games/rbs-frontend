import { LoaderCircle } from 'lucide-react';
import { createSlot, createSlottable } from 'radix-ui/slot';
import type { ComponentProps, ReactElement } from 'react';
import { CONTROL_SHELL } from '@/components/primitives/internal/control';
import { cn } from '@/lib/cn';

/**
 * The four §5.5 variants, and nothing else.
 *
 * Note what `danger` is NOT built from. --status-critical is the obvious name,
 * but it is identical in both themes and the dark palette has no ink that
 * clears 4.5:1 on it (best is 4.12:1) — so it stays a mark colour and the fill
 * is --polarity-bad, which flips with the theme and has --danger-ink to match.
 * contrast.test.ts asserts both halves of that.
 *
 * The `/90` hovers are contrast-safe (worst case 5.42:1) but directionally
 * wrong on paper: they LIGHTEN, which reads as disabled rather than hovered.
 * Measured --gold-accent-hover / --polarity-bad-hover tokens are logged as a
 * §5.2 follow-up; this is the placeholder, not the answer.
 */
const VARIANTS = {
  primary: 'bg-gold text-gold-ink hover:bg-gold/90',
  secondary: 'border-rule bg-surface text-ink border hover:bg-raised',
  ghost: 'text-ink-secondary hover:bg-raised hover:text-ink',
  danger: 'bg-bad text-danger-ink hover:bg-bad/90',
} as const;

const Slot = createSlot('Button');
const Slottable = createSlottable('Button');

/**
 * `busyLabel` is required whenever `loading` is set — the same shape golden
 * rule 9 uses for tone/icon. A busy state nobody can hear is not a busy state,
 * and making the string a required prop is what keeps it externalizable when
 * Phase 2 lands the message catalog (§5.6: no hard-coded UI text).
 */
type BusyProps =
  | { readonly loading: true; readonly busyLabel: string }
  | { readonly loading?: false; readonly busyLabel?: never };

export type ButtonProps = ComponentProps<'button'> & {
  readonly variant?: keyof typeof VARIANTS;
  /** Leading glyph. Hidden from assistive tech — the label carries the meaning. */
  readonly icon?: ReactElement;
  readonly asChild?: boolean;
} & BusyProps;

export function Button({
  variant = 'secondary',
  icon,
  asChild = false,
  loading = false,
  busyLabel,
  className,
  children,
  disabled,
  type,
  ...rest
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  const isDisabled = disabled === true || loading;

  return (
    <>
      <Component
        className={cn(CONTROL_SHELL, VARIANTS[variant], className)}
        aria-busy={loading || undefined}
        {...(asChild
          ? // A Slot may wrap an <a>, where `disabled` is not a valid attribute
            // and `type` is meaningless. aria-disabled conveys the state without
            // emitting invalid HTML.
            { 'aria-disabled': isDisabled || undefined }
          : // An unset `type` inside a <form> SUBMITS it. That is the single
            // most common Button bug, and defaulting here means no caller has
            // to remember.
            { type: type ?? 'button', disabled: isDisabled })}
        {...rest}
      >
        {loading ? (
          // Replaces the icon rather than the label: swapping the label for a
          // spinner changes the size of a text container, which §5.6 forbids,
          // and momentarily removes the button's accessible name.
          //
          // Safe under prefers-reduced-motion by arithmetic, not luck —
          // tokens.css forces animation-iteration-count to 1, so a single 1ms
          // rotation completes and lands back at 0deg.
          <LoaderCircle className="size-16 animate-spin" aria-hidden={true} />
        ) : icon ? (
          <span className="contents [&_svg]:size-16" aria-hidden={true}>
            {icon}
          </span>
        ) : null}

        <Slottable>{children}</Slottable>
      </Component>

      {/*
        A SIBLING, not a child. Inside the button this text would join the
        accessible name — "Save" would become "Save Saving…" mid-flight — and
        the contract test that pins every primitive to exactly its given label
        would be asserting a lie. sr-only is position:absolute, so a stray flex
        or grid parent is unaffected.
      */}
      {loading ? (
        <span className="sr-only" role="status">
          {busyLabel}
        </span>
      ) : null}
    </>
  );
}
