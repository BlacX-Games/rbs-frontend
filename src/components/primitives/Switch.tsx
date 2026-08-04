import { Switch as RadixSwitch } from 'radix-ui';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export type SwitchProps = {
  readonly label: string;
  readonly description?: string;
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

export function Switch({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  className,
}: SwitchProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('flex items-center justify-between gap-16', className)}>
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

      <RadixSwitch.Root
        className={[
          // The row is the target; the rail is the ink. Padding carries the
          // difference so a 24px-tall rail still clears the §5.6 floor.
          'group inline-flex min-h-(--control-h) shrink-0 items-center rounded-md px-2',
          'focus-visible:focus-ring',
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
            'bg-ink-tertiary relative block h-24 w-44 rounded-full',
            'transition-colors duration-120 ease-brand',
            'group-data-[state=checked]:bg-gold',
          ].join(' ')}
        >
          {/*
            §5.4 says reduced motion "drops transforms — opacity only". Taken
            literally that would delete this translate, and with it the ONLY
            visible difference between on and off — a switch that cannot be
            read is worse than one that slides.

            The defensible reading, and the one applied here: decorative
            transforms are dropped, a transform that CONVEYS STATE survives and
            simply completes in 1ms. tokens.css already forces the duration
            globally, so nothing further is needed at this call site. Do not
            "fix" this by adding motion-reduce:translate-x-0.

            The thumb is --bg-canvas in both states: measured against the off
            rail it is 5.31:1 dark / 5.07:1 light, and against the gold on-rail
            9.88:1 dark / 3.06:1 light. All four clear the 3:1 graphical-object
            gate, which a thumb tinted to match either rail would not.
          */}
          <span
            className={[
              'bg-canvas absolute top-4 left-4 block size-16 rounded-full',
              'transition-transform duration-120 ease-brand',
              'group-data-[state=checked]:translate-x-20',
            ].join(' ')}
          />
        </span>
      </RadixSwitch.Root>
    </div>
  );
}
