import { RadioGroup as RadixRadioGroup } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Two components in one file, which `react-refresh` permits and which is right
 * here: a `Radio` outside a `RadioGroup` has no meaning at all — no name, no
 * roving tabindex, no single tab stop — so shipping them apart would invite
 * exactly that mistake.
 */

export type RadioGroupProps = {
  /** Names the group itself, which is what a screen reader reads on entry. */
  readonly label: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
  readonly orientation?: 'vertical' | 'horizontal';
  readonly disabled?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
};

export function RadioGroup({
  label,
  value,
  defaultValue,
  onValueChange,
  orientation = 'vertical',
  disabled = false,
  className,
  children,
}: RadioGroupProps) {
  return (
    <RadixRadioGroup.Root
      aria-label={label}
      className={cn(
        'flex gap-4',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center gap-16',
        className,
      )}
      disabled={disabled}
      orientation={orientation}
      {...(value !== undefined && { value })}
      {...(defaultValue !== undefined && { defaultValue })}
      {...(onValueChange !== undefined && { onValueChange })}
    >
      {children}
    </RadixRadioGroup.Root>
  );
}

export type RadioProps = {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
};

export function Radio({ value, label, disabled = false }: RadioProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-4">
      <RadixRadioGroup.Item
        className={[
          'group inline-grid min-h-(--control-h) min-w-(--control-h) shrink-0 place-items-center',
          'rounded-md focus-visible:focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' ')}
        disabled={disabled}
        id={id}
        value={value}
      >
        <span
          className={[
            'border-control-edge bg-surface grid size-20 place-items-center rounded-full border',
            'transition-colors duration-120 ease-brand',
            'group-data-[state=checked]:border-gold',
          ].join(' ')}
        >
          {/*
            A filled dot rather than a glyph — a circle is the shape convention
            that distinguishes "one of these" from a checkbox's "any of these",
            and shape is a non-colour channel in its own right.
          */}
          <RadixRadioGroup.Indicator className="bg-gold size-8 rounded-full" />
        </span>
      </RadixRadioGroup.Item>

      <label className="text-ink text-base" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
