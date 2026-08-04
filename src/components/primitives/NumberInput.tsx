import { Minus, Plus } from 'lucide-react';
import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { IconButton } from '@/components/primitives/IconButton';
import { Field } from '@/components/primitives/internal/Field';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

/**
 * A number field that behaves like the ARIA spinbutton pattern rather than like
 * `<input type="number">`.
 *
 * NEVER BIND THIS TO MONEY. Golden rule 10: currency is a string end to end,
 * because Decimal(12,2) does not round-trip through IEEE-754 and the Unity
 * EconomyTests assert 3 × 19.99 === 59.97 exactly. `value` is a `number` and
 * says so honestly; a `string` API here would LOOK money-safe while calling
 * Number() internally to clamp, which is the worse failure. Currency gets a
 * MoneyInput built over `lib/money.ts`.
 */

/** Permits the intermediate states of typing — "", "-", "1.", "-0." */
const PARTIAL_NUMBER = /^-?\d*(\.\d*)?$/;

export type NumberInputProps = {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  /** Controlled. Omit and pass `defaultValue` for the uncontrolled form. */
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onValueChange?: (next: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Required — a stepper with no accessible name announces only "button". */
  readonly incrementLabel: string;
  readonly decrementLabel: string;
  /** Feeds `aria-valuetext`, e.g. rendering 0.15 as "15 percent". */
  readonly formatValue?: (value: number) => string;
  readonly disabled?: boolean;
  readonly className?: string;
};

export function NumberInput({
  label,
  labelHidden,
  description,
  error,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  incrementLabel,
  decrementLabel,
  formatValue,
  disabled = false,
  className,
}: NumberInputProps) {
  const { id, descriptionId, errorId, describedBy } = useFieldIds({
    hasDescription: description !== undefined,
    hasError: error !== undefined,
  });

  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? min ?? 0);
  const current = isControlled ? value : uncontrolled;

  /*
   * The displayed text is its own state, because the text an operator is
   * part-way through typing is not yet a number. "1" on the road to "10" must
   * survive a min of 5, and "-" and "1." are not numbers at all.
   */
  const [text, setText] = useState(() => String(current));
  const [lastValue, setLastValue] = useState(current);

  if (current !== lastValue) {
    // Deriving during render rather than in an effect: an effect would repaint
    // with stale text first, and React 19's set-state-in-effect rule rejects it.
    setLastValue(current);

    // Only overwrite when the incoming value disagrees with what is on screen.
    // Without this guard a controlled parent echoing our own onValueChange back
    // would rewrite "007" to "7" under the operator's cursor.
    if (Number(text) !== current) setText(String(current));
  }

  const clamp = (next: number): number => {
    const lowered = max === undefined ? next : Math.min(next, max);
    return min === undefined ? lowered : Math.max(lowered, min);
  };

  const commit = (next: number): void => {
    const clamped = clamp(next);

    setText(String(clamped));
    setLastValue(clamped);
    if (!isControlled) setUncontrolled(clamped);
    onValueChange?.(clamped);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const next = event.target.value;

    // Rejected by not updating state, so React restores the previous value and
    // the keystroke simply never lands.
    if (!PARTIAL_NUMBER.test(next)) return;

    setText(next);

    const parsed = Number(next);
    if (next === '' || !Number.isFinite(parsed)) return;

    /*
     * Emitted UNCLAMPED, on purpose. Clamping per keystroke makes 10
     * unreachable when min is 5 — the "1" clamps to "5" before the "0" arrives.
     * Blur and the steppers are where the value is forced into range.
     */
    setLastValue(parsed);
    if (!isControlled) setUncontrolled(parsed);
    onValueChange?.(parsed);
  };

  const handleBlur = (): void => {
    const parsed = Number(text);
    commit(text === '' || !Number.isFinite(parsed) ? current : parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // The ARIA spinbutton keyboard contract. Every branch preventDefaults:
    // arrows would otherwise move the caret and PageUp/PageDown scroll the page
    // out from under the operator.
    const moves: Readonly<Record<string, number | undefined>> = {
      ArrowUp: step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    };

    const delta = moves[event.key];
    if (delta !== undefined) {
      event.preventDefault();
      commit(current + delta);
      return;
    }

    if (event.key === 'Home' && min !== undefined) {
      event.preventDefault();
      commit(min);
    }

    if (event.key === 'End' && max !== undefined) {
      event.preventDefault();
      commit(max);
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
    >
      {/*
        Steppers sit BESIDE the field, not stacked inside it. Two stacked
        chevrons cannot each be 44px tall inside a 44px row, so the usual
        native-looking arrangement fails §5.6 by construction — and side-by-side
        is the better touch layout anyway.
      */}
      <div className={cn('flex items-stretch gap-4', className)}>
        <IconButton
          disabled={disabled || (min !== undefined && current <= min)}
          icon={<Minus />}
          label={decrementLabel}
          onClick={() => {
            commit(current - step);
          }}
          variant="secondary"
        />

        <input
          aria-describedby={describedBy}
          aria-invalid={error !== undefined || undefined}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={current}
          aria-valuetext={formatValue?.(current)}
          className={cn(FIELD_SHELL, 'min-w-0 flex-1 text-center')}
          disabled={disabled}
          id={id}
          // type="text" with inputMode, not type="number". The native control
          // accepts "e" and "+", drops trailing zeros, and renders spinners far
          // below any tap-target floor.
          inputMode="numeric"
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          role="spinbutton"
          type="text"
          value={text}
        />

        <IconButton
          disabled={disabled || (max !== undefined && current >= max)}
          icon={<Plus />}
          label={incrementLabel}
          onClick={() => {
            commit(current + step);
          }}
          variant="secondary"
        />
      </div>
    </Field>
  );
}
