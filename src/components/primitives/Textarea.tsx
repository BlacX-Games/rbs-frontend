import type { ComponentProps } from 'react';
import { Field } from '@/components/primitives/internal/Field';
import { FIELD_SHELL } from '@/components/primitives/internal/control';
import { useFieldIds } from '@/components/primitives/internal/useFieldIds';
import { cn } from '@/lib/cn';

export type TextareaProps = Omit<ComponentProps<'textarea'>, 'id'> & {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
};

export function Textarea({
  label,
  labelHidden,
  description,
  error,
  className,
  rows = 3,
  ...rest
}: TextareaProps) {
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
      <textarea
        aria-describedby={describedBy}
        aria-invalid={error !== undefined || undefined}
        // §5.6's "no fixed-height text containers" is most literally about this
        // element. `field-sizing-content` grows the box with its content in
        // Chromium; `rows` is the floor everywhere else, since Firefox and
        // Safari do not ship field-sizing yet. Neither is a fixed height, which
        // is the point — a review being redacted at +30% text expansion must
        // not scroll inside a 3-line well.
        className={cn(FIELD_SHELL, 'field-sizing-content resize-y', className)}
        id={id}
        rows={rows}
        {...rest}
      />
    </Field>
  );
}
