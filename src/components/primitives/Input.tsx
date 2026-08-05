import type { ComponentProps } from 'react';
import { Field } from '@/components/primitives/internal/Field';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

/**
 * Deliberately narrower than `<input>`.
 *
 * `number` is missing because NumberInput exists: type="number" silently
 * accepts `e` and `+`, drops trailing zeros, and ships ~12px native spinners
 * that no density setting can reach. `password` is missing because it wants a
 * reveal affordance of its own and nothing in stage 2a needs one.
 *
 * Money never comes here either — golden rule 10 keeps it a string end to end,
 * and it gets a MoneyInput over `lib/money.ts` once that lands.
 */
type InputType = 'text' | 'email' | 'url' | 'search' | 'tel';

export type InputProps = Omit<ComponentProps<'input'>, 'type' | 'id'> & {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly type?: InputType;
};

export function Input({
  label,
  labelHidden,
  description,
  error,
  type = 'text',
  className,
  ...rest
}: InputProps) {
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
      <input
        aria-describedby={describedBy}
        // `|| undefined` rather than `false`: aria-invalid="false" is a valid
        // but noisy attribute, and it renders on every healthy field in the app.
        aria-invalid={error !== undefined || undefined}
        className={cn(FIELD_SHELL, className)}
        id={id}
        type={type}
        {...rest}
      />
    </Field>
  );
}
