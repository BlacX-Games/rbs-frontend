import { Check, Minus } from 'lucide-react';
import { Checkbox as RadixCheckbox } from 'radix-ui';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export type CheckboxProps = {
  readonly label: string;
  readonly description?: string;
  readonly checked?: boolean | 'indeterminate';
  readonly defaultChecked?: boolean | 'indeterminate';
  readonly onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

export function Checkbox({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  className,
}: CheckboxProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('flex items-start gap-4', className)}>
      <RadixCheckbox.Root
        // The 44×44 target lives on the Root, with the visual box nested
        // inside. §5.6 measures the TARGET, not the ink — so the checkbox can
        // stay a restrained 20px square while the thing an operator has to hit
        // with a thumb follows --control-h.
        className={[
          'group inline-grid min-h-(--control-h) min-w-(--control-h) shrink-0 place-items-center',
          'rounded-md focus-visible:focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' ')}
        disabled={disabled}
        id={id}
        {...(description !== undefined && { 'aria-describedby': descriptionId })}
        {...(checked !== undefined && { checked })}
        {...(defaultChecked !== undefined && { defaultChecked })}
        {...(onCheckedChange !== undefined && { onCheckedChange })}
      >
        <span
          className={[
            'border-control-edge bg-surface grid size-20 place-items-center rounded-sm border',
            'transition-colors duration-120 ease-brand',
            'group-data-[state=checked]:border-gold group-data-[state=checked]:bg-gold',
            'group-data-[state=indeterminate]:border-gold group-data-[state=indeterminate]:bg-gold',
          ].join(' ')}
        >
          <RadixCheckbox.Indicator
            // Both glyphs occupy grid cell 1/1 and CSS chooses between them.
            // Radix's Indicator gives no state to its children, and rendering
            // the wrong glyph for `indeterminate` is a real misreport: a mixed
            // checkbox showing a tick claims a selection nobody made.
            className="text-gold-ink grid [&>svg]:col-start-1 [&>svg]:row-start-1"
          >
            <Check aria-hidden={true} className="size-16 group-data-[state=indeterminate]:hidden" />
            <Minus
              aria-hidden={true}
              className="hidden size-16 group-data-[state=indeterminate]:block"
            />
          </RadixCheckbox.Indicator>
        </span>
      </RadixCheckbox.Root>

      <div className="flex min-h-(--control-h) flex-col justify-center gap-2 py-4">
        <label className="text-ink text-base" htmlFor={id}>
          {label}
        </label>
        {description === undefined ? null : (
          <p className="text-ink-secondary text-sm" id={descriptionId}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
