import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { Field } from '@/components/primitives/internal/Field';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

/**
 * A password field with a reveal toggle.
 *
 * `Input` deliberately excludes `type="password"`, and says why: "it wants a
 * reveal affordance of its own and nothing in stage 2a needs one." Sign-in is
 * what needs one, so this is that component rather than a widened `InputType` —
 * widening would give every caller a password field with no way to check what
 * they typed, which is the affordance the exclusion was protecting.
 *
 * ── The reveal is an accessibility feature, not a convenience ───────────────
 * Masked input is the single most common source of failed sign-ins, and it
 * falls hardest on operators using a screen reader, an unfamiliar keyboard
 * layout, or a password manager that filled the wrong field. WCAG 2.2 SC 3.3.8
 * exists for this. The state is per-field and resets on unmount — nothing is
 * persisted, and the DOM never holds a revealed value the operator did not ask
 * to reveal.
 */
export type PasswordInputProps = Omit<ComponentProps<'input'>, 'type' | 'id'> & {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  /** Names the toggle in its hidden state — "Show password". Required. */
  readonly revealLabel: string;
  /** …and in its revealed state — "Hide password". Required. */
  readonly hideLabel: string;
};

export function PasswordInput({
  label,
  labelHidden,
  description,
  error,
  revealLabel,
  hideLabel,
  className,
  ...rest
}: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false);
  const { id, labelId, descriptionId, errorId, describedBy } = useFieldIds({
    hasDescription: description !== undefined,
    hasError: error !== undefined,
  });

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
      {/*
        The toggle sits INSIDE the field shell rather than beside it, so the
        border that identifies the control still bounds the whole thing — §5.2's
        `--control-edge` is the affordance, and a button outside it would read
        as unrelated to the field.
      */}
      <div className={cn(FIELD_SHELL, 'flex items-center gap-8 p-0', className)}>
        <input
          aria-describedby={describedBy}
          aria-invalid={error !== undefined || undefined}
          className="min-h-(--control-h) min-w-0 flex-1 bg-transparent px-12 outline-none"
          id={id}
          type={revealed ? 'text' : 'password'}
          {...rest}
        />

        {/*
          A plain button, not `IconButton`: this one lives inside another
          control's border and must not carry its own. `aria-pressed` states the
          toggle's condition, which is what tells a screen-reader user the
          password is currently visible — a label change alone announces the
          next action without ever saying the current one.
        */}
        <button
          aria-pressed={revealed}
          className="focus-visible:focus-ring text-ink-secondary hover:text-ink flex min-h-(--control-h) items-center rounded-sm px-12"
          onClick={() => {
            setRevealed((current) => !current);
          }}
          // Never `submit`: this button sits inside a form, and the default
          // would submit it on every reveal.
          type="button"
        >
          {revealed ? (
            <EyeOff aria-hidden={true} className="size-16" />
          ) : (
            <Eye aria-hidden={true} className="size-16" />
          )}
          <span className="sr-only">{revealed ? hideLabel : revealLabel}</span>
        </button>
      </div>
    </Field>
  );
}
