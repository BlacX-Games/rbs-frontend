import { Slider as RadixSlider } from 'radix-ui';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export type SliderProps = {
  readonly label: string;
  /** Readonly on the public surface; Radix takes a mutable array internally. */
  readonly value?: readonly number[];
  readonly defaultValue?: readonly number[];
  readonly onValueChange?: (next: number[]) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Feeds `aria-valuetext` — "42 covers" reads better than "42". */
  readonly formatValue?: (value: number) => string;
  readonly disabled?: boolean;
  readonly className?: string;
};

export function Slider({
  label,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  disabled = false,
  className,
}: SliderProps) {
  const id = useId();
  const current = value ?? defaultValue ?? [min];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <label className="text-ink text-sm font-medium" htmlFor={id}>
        {label}
      </label>

      <RadixSlider.Root
        // The TARGET is this row, not the thumb. Radix moves the nearest thumb
        // on a track click, so an operator can hit anywhere in 44px of height
        // while the thumb stays a restrained 16px. Sizing the thumb itself to
        // 44px would be the obvious reading of §5.6 and would look absurd.
        className="relative flex min-h-(--control-h) w-full touch-none items-center select-none"
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        step={step}
        // Spread as mutable copies: Radix declares number[], and a readonly
        // array is not assignable to it.
        {...(value !== undefined && { value: [...value] })}
        {...(defaultValue !== undefined && { defaultValue: [...defaultValue] })}
        {...(onValueChange !== undefined && { onValueChange })}
      >
        {/*
          The rail carries a border, not just a fill. `bg-raised` alone measures
          1.07:1 dark / 1.02:1 light against the surface it sits on — a rail
          nobody can see. The control edge is what makes the track's extent
          legible, which SC 1.4.11 asks for on the component boundary.
        */}
        <RadixSlider.Track className="border-control-edge bg-raised relative h-8 grow rounded-full border">
          <RadixSlider.Range className="bg-gold absolute h-full rounded-full" />
        </RadixSlider.Track>

        {current.map((thumbValue, index) => (
          <RadixSlider.Thumb
            aria-label={current.length > 1 ? `${label} ${String(index + 1)}` : label}
            className={[
              'bg-gold border-gold-ink block size-16 rounded-full border-2',
              'focus-visible:focus-ring',
              'disabled:cursor-not-allowed',
            ].join(' ')}
            // Index is a legitimate key here: the thumbs of a range slider have
            // no identity beyond their position, and reordering them IS the
            // interaction.
            key={index}
            {...(formatValue !== undefined && { 'aria-valuetext': formatValue(thumbValue) })}
          />
        ))}
      </RadixSlider.Root>
    </div>
  );
}
