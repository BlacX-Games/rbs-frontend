import { RadarChart } from '@/components/charts/RadarChart';
import type { SeriesSlot } from '@/components/charts/chart';
import {
  FLAVOR_DIMENSIONS,
  FLAVOR_DIMENSION_LABELS,
  type FlavorDimension,
  type FlavorProfile,
} from '@/domain/flavor';
import { NumberInput } from '@/components/primitives/NumberInput';
import { cn } from '@/lib/cn';

/** Canonical order, humanised once. Module-scoped so it is not rebuilt per render. */
const FLAVOR_AXES: readonly string[] = FLAVOR_DIMENSIONS.map(
  (dimension) => FLAVOR_DIMENSION_LABELS[dimension],
);

export type FlavorProfileEditorProps = {
  readonly label: string;
  readonly value: FlavorProfile;
  readonly onValueChange: (next: FlavorProfile) => void;
  /** Builds each stepper's name: `(d, dir) => \`${dir} ${d}\``. */
  readonly stepLabel: (dimension: FlavorDimension, direction: 'Increase' | 'Decrease') => string;
  readonly chartTableLabel: string;
  readonly chartChartLabel: string;
  /** A second profile drawn behind, for comparison against an anchor. */
  readonly compareTo?: { readonly label: string; readonly profile: FlavorProfile };
  readonly slot?: SeriesSlot;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * The ten dimensions as a radar paired with numeric inputs.
 *
 * Paired, not either-or: the radar shows the SHAPE — whether a dish reads as
 * smoky-and-fatty or bright-and-acidic — and the inputs are how a value is
 * actually set. A radar alone cannot be typed into, and ten spinners alone hide
 * the profile the reader is authoring.
 *
 * Values are clamped 0–100 by NumberInput, which also refuses non-numeric text
 * and clamps on blur rather than per keystroke.
 */
export function FlavorProfileEditor({
  label,
  value,
  onValueChange,
  stepLabel,
  chartTableLabel,
  chartChartLabel,
  compareTo,
  slot = 1,
  disabled = false,
  className,
}: FlavorProfileEditorProps) {
  const toSeries = (
    profile: FlavorProfile,
    key: string,
    seriesLabel: string,
    seriesSlot: SeriesSlot,
  ) => ({
    key,
    label: seriesLabel,
    slot: seriesSlot,
    // Axis identity is the LABEL, not the wire key, so `'Fatty/Rich'` reads as
    // "Fatty / Rich" on the chart. `x` and `axes` must agree, which is why both
    // go through the same record rather than one being humanised at render.
    points: FLAVOR_DIMENSIONS.map((dimension) => ({
      x: FLAVOR_DIMENSION_LABELS[dimension],
      y: profile[dimension],
    })),
  });

  const series = [
    toSeries(value, 'profile', label, slot),
    ...(compareTo === undefined
      ? []
      : [toSeries(compareTo.profile, 'compare', compareTo.label, slot === 2 ? 3 : 2)]),
  ];

  return (
    <div className={cn('flex flex-col gap-16 md:flex-row md:items-start', className)}>
      <div className="min-w-0 flex-1">
        <RadarChart
          axes={FLAVOR_AXES}
          chartLabel={chartChartLabel}
          height={280}
          series={series}
          tableLabel={chartTableLabel}
          title={label}
          xLabel="Dimension"
        />
      </div>

      {/*
        A fieldset, because these ten inputs are one value. Without it a screen
        reader announces ten unrelated spinbuttons and never says they compose a
        flavour profile.
      */}
      <fieldset className="flex min-w-0 flex-1 flex-col gap-8">
        <legend className="text-ink-tertiary pb-8 text-xs font-medium tracking-[0.14em] uppercase">
          {label}
        </legend>

        {FLAVOR_DIMENSIONS.map((dimension) => (
          <NumberInput
            decrementLabel={stepLabel(dimension, 'Decrease')}
            disabled={disabled}
            incrementLabel={stepLabel(dimension, 'Increase')}
            key={dimension}
            label={FLAVOR_DIMENSION_LABELS[dimension]}
            max={100}
            min={0}
            onValueChange={(next) => {
              onValueChange({ ...value, [dimension]: next });
            }}
            value={value[dimension]}
          />
        ))}
      </fieldset>
    </div>
  );
}
