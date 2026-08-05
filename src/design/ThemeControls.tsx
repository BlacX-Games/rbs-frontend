import { Monitor, Moon, Rows2, Rows4, Sun } from 'lucide-react';
import type { ComponentType } from 'react';
import { ToggleGroup } from 'radix-ui';
import type { Density, Theme } from '@/design/theme';
import { useTheme } from '@/design/theme-context';

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const THEME_OPTIONS: readonly Option<Theme>[] = [
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'light', label: 'Paper', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
];

const DENSITY_OPTIONS: readonly Option<Density>[] = [
  { value: 'comfortable', label: 'Comfortable', Icon: Rows2 },
  { value: 'compact', label: 'Compact', Icon: Rows4 },
];

/**
 * Shared segmented control.
 *
 * Radix `ToggleGroup` rather than a hand-rolled radiogroup: it already
 * implements the §5.6 keyboard contract — one tab stop for the group, arrow
 * keys to move within it — and getting roving tabindex subtly wrong is the
 * classic way a "custom" segmented control fails a screen-reader pass.
 *
 * Every option carries an icon AND a text label. The label is visually hidden
 * at this size but read aloud, so the control never communicates by colour
 * alone (golden rule 9).
 */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      // Radix emits '' when the pressed item is toggled off. A segmented
      // control has no "none" state, so that case is dropped rather than
      // allowed to blank the preference.
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="border-rule inline-flex items-center gap-2 rounded-md border p-2"
    >
      {options.map(({ value: optionValue, label: optionLabel, Icon }) => (
        <ToggleGroup.Item
          key={optionValue}
          value={optionValue}
          title={optionLabel}
          className={[
            // The TARGET follows --control-h; the gold fill below stays 32px.
            // §5.6 asks for 44×44 in comfortable density and this control was
            // hard-coded to 32 at both densities — the first consumer of
            // --control-h, and the reason it had none until stage 2a.
            //
            // Note axe cannot see this: WCAG 2.2 SC 2.5.8 sets the AA floor at
            // 24×24, and 44×44 is SC 2.5.5, which is AAA. Only the
            // boundingBox() assertions in e2e/design.matrix.spec.ts catch it.
            'group text-ink-secondary grid min-h-(--control-h) min-w-(--control-h)',
            'place-items-center rounded-sm transition-colors duration-120 ease-brand',
            'hover:text-ink focus-visible:focus-ring',
          ].join(' ')}
        >
          {/*
            The visual weight is unchanged — SC 2.5.5 and 2.5.8 both measure the
            target, not the ink, so the gold fill stays a restrained 32px square
            inside a 44px hit area.
          */}
          <span
            className={[
              'grid size-32 place-items-center rounded-sm',
              'transition-colors duration-120 ease-brand',
              'group-data-[state=on]:bg-gold group-data-[state=on]:text-gold-ink',
            ].join(' ')}
          >
            <Icon className="size-16" aria-hidden={true} />
          </span>
          <span className="sr-only">{optionLabel}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return <Segmented label="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />;
}

export function DensityToggle() {
  const { density, setDensity } = useTheme();

  return (
    <Segmented label="Density" options={DENSITY_OPTIONS} value={density} onChange={setDensity} />
  );
}
