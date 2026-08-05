import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The label / description / error shell every text field wears.
 *
 * Every prop is REQUIRED even where it accepts `undefined`. Under
 * `exactOptionalPropertyTypes` an optional prop rejects an explicitly-passed
 * `undefined`, so an optional `description?: string` would force each caller to
 * conditionally spread. Required-but-nullable is the shape that lets a
 * primitive forward what it received.
 */
export interface FieldProps {
  readonly id: string;
  /** Lets a trigger reference the label as part of a composed name. */
  readonly labelId: string;
  readonly descriptionId: string;
  readonly errorId: string;
  readonly label: string;
  /** Still associated and still announced — only visually removed. */
  readonly labelHidden: boolean | undefined;
  readonly description: string | undefined;
  readonly error: string | undefined;
  readonly children: ReactNode;
}

export function Field({
  id,
  labelId,
  descriptionId,
  errorId,
  label,
  labelHidden,
  description,
  error,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-4">
      {/*
        A real <label htmlFor>, not aria-label. It gives the click-to-focus
        behaviour operators expect from a dense form, and it survives
        translation as ordinary text rather than as an attribute (§5.6).
      */}
      <label
        className={cn('text-ink text-sm font-medium', labelHidden && 'sr-only')}
        htmlFor={id}
        id={labelId}
      >
        {label}
      </label>

      {description === undefined ? null : (
        <p className="text-ink-secondary text-sm" id={descriptionId}>
          {description}
        </p>
      )}

      {children}

      {error === undefined ? null : (
        // Golden rule 9: the glyph is what makes this an error without colour.
        // --polarity-bad clears 4.5:1 on every surface a field sits on, so the
        // text may also be red — but the glyph is the load-bearing channel and
        // removing it would leave colour carrying the meaning alone.
        //
        // Announced through aria-describedby rather than role="alert": an alert
        // interrupts whatever is being read, which is wrong for a validation
        // message the operator reaches by focusing the field.
        <p className="text-bad flex items-center gap-4 text-sm" id={errorId}>
          <TriangleAlert aria-hidden={true} className="size-16 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
