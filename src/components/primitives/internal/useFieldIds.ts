import { useId } from 'react';

export interface FieldIds {
  readonly id: string;
  /**
   * The `<label>` element's own id.
   *
   * Needed whenever a control's accessible name must be the label PLUS
   * something else — a button trigger showing a chosen value, say. A
   * `<label for>` overrides a button's text content entirely, so without this
   * the value it displays is never announced.
   */
  readonly labelId: string;
  readonly descriptionId: string;
  readonly errorId: string;
  /**
   * Ready to hand straight to `aria-describedby`, or `undefined` when the field
   * has neither a description nor an error.
   *
   * `undefined` rather than `''`: an empty aria-describedby is a dangling
   * reference, and some screen readers announce the failure to resolve it.
   */
  readonly describedBy: string | undefined;
}

/**
 * One `useId` per field, and the three derived ids that hang off it.
 *
 * React's `useId` is SSR-safe and collision-free, which matters more than it
 * sounds: the gallery renders every field primitive several times on one page,
 * and hand-authored ids there would produce duplicate-id axe violations that
 * look like component bugs.
 */
export function useFieldIds(options: {
  readonly hasDescription: boolean;
  readonly hasError: boolean;
}): FieldIds {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  // Order matters to a screen reader: the description explains the field, the
  // error says what went wrong with it. Description first reads as instruction
  // then correction, which is the order an operator can act on.
  const described = [
    options.hasDescription ? descriptionId : null,
    options.hasError ? errorId : null,
  ].filter((part) => part !== null);

  return {
    id,
    labelId,
    descriptionId,
    errorId,
    describedBy: described.length > 0 ? described.join(' ') : undefined,
  };
}
