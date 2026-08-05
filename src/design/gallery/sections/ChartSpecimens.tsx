import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';
import { Funnel } from '@/components/charts/Funnel';
import { Heatmap } from '@/components/charts/Heatmap';
import { LineChart } from '@/components/charts/LineChart';
import { RadarChart } from '@/components/charts/RadarChart';
import { SmallMultiples } from '@/components/charts/SmallMultiples';
import { Sparkline } from '@/components/charts/Sparkline';
import { StackedBar } from '@/components/charts/StackedBar';
import type { ChartSeries } from '@/components/charts/chart';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';
import { FLAVOR_DIMENSIONS, FLAVOR_DIMENSION_LABELS } from '@/domain/flavor';

/**
 * Fixture data derived from the seed values the plan names, so the gallery
 * shows `Declan's Smokehouse` rather than lorem ipsum.
 */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function seriesOf(
  key: string,
  label: string,
  slot: ChartSeries['slot'],
  values: readonly number[],
): ChartSeries {
  return {
    key,
    label,
    slot,
    points: values.map((y, index) => ({ x: DAYS[index] ?? String(index), y })),
  };
}

const COVERS = seriesOf('covers', 'Covers', 1, [32, 41, 28, 45, 62, 78, 54]);
const REVENUE = seriesOf('revenue', 'Revenue', 2, [980, 1240, 860, 1380, 1840, 2260, 1610]);

/** The four cost buckets from §6.1's session detail. */
const BUCKETS = [
  seriesOf('food', 'Food', 1, [480, 520, 410, 560, 640, 780, 590]),
  seriesOf('beverage', 'Beverage', 2, [180, 210, 160, 230, 280, 340, 250]),
  seriesOf('labour', 'Labour', 3, [320, 340, 300, 360, 400, 460, 380]),
];

/** Ordered stages, so this uses the ordinal tier ramp rather than eight hues. */
const TIERS = [
  { key: 'new', label: 'New', value: 1204 },
  { key: 'known', label: 'Known', value: 842 },
  { key: 'popular', label: 'Popular', value: 391 },
  { key: 'beloved', label: 'Beloved', value: 118 },
] as const;

/**
 * The canonical FlavorDimension order — never sorted, the reading depends on it.
 *
 * Derived rather than restated: a second copy of this list is exactly how the
 * gallery ended up specimen-ing ten dimensions the backend has never heard of.
 */
const FLAVOUR_AXES: readonly string[] = FLAVOR_DIMENSIONS.map(
  (dimension) => FLAVOR_DIMENSION_LABELS[dimension],
);

const PROFILES: readonly ChartSeries[] = [
  {
    key: 'brisket',
    label: 'Smoked Brisket Sandwich',
    slot: 1,
    points: [72, 34, 28, 18, 88, 42, 76, 94, 22, 30].map((y, index) => ({
      x: FLAVOUR_AXES[index] ?? '',
      y,
    })),
  },
  {
    key: 'salmon',
    label: 'Pan-Seared Salmon',
    slot: 2,
    points: [54, 22, 46, 14, 70, 18, 58, 20, 62, 66].map((y, index) => ({
      x: FLAVOUR_AXES[index] ?? '',
      y,
    })),
  },
];

/** Ten archetypes — the case §5.2 says must never become ten hues. */
const ARCHETYPES: readonly ChartSeries[] = [
  'Budget guest',
  'Family diner',
  'Date night',
  'Business lunch',
  'Solo regular',
  'Tourist',
  'Critic',
  'Celebration',
  'Late night',
  'Vegan',
].map((label, index) => ({
  key: label,
  label,
  slot: 4,
  points: DAYS.map((day, dayIndex) => ({
    x: day,
    y: Math.round(20 + ((index * 7 + dayIndex * 11) % 40)),
  })),
}));

const HOURS = ['17', '18', '19', '20', '21', '22'] as const;

export function ChartSpecimens() {
  return (
    <Section title="Charts">
      <SpecimenGroup title="Sparkline — a texture, not a readout">
        <Specimen label="inside a stat tile">
          <span className="flex items-center gap-12">
            <span className="font-display text-3xl">1,840</span>
            <Sparkline
              label="Revenue"
              points={REVENUE.points}
              summary="up 64% over seven services"
            />
          </span>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="LineChart — one axis, always">
        <Specimen label="two series, endpoint-labelled">
          <div className="w-full min-w-96">
            <LineChart
              chartLabel="Show as chart"
              description="Never a dual y-axis — two measures of different scale become two charts."
              series={[COVERS]}
              tableLabel="Show as table"
              title="Covers this week"
              xLabel="Day"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="AreaChart — a 10% wash, one series only">
        <Specimen label="single series">
          <div className="w-full min-w-96">
            <AreaChart
              chartLabel="Show as chart"
              series={[REVENUE]}
              tableLabel="Show as table"
              title="Revenue this week"
              xLabel="Day"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="BarChart — one colour per series, baseline at zero">
        <Specimen label="single series">
          <div className="w-full min-w-96">
            <BarChart
              chartLabel="Show as chart"
              description="Never darker-where-bigger: that double-encodes length as hue."
              series={[COVERS]}
              tableLabel="Show as table"
              title="Covers by day"
              xLabel="Day"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="StackedBar — part-to-whole, separated by surface">
        <Specimen label="the four cost buckets">
          <div className="w-full min-w-96">
            <StackedBar
              chartLabel="Show as chart"
              description="Segments are separated by a 2px gap of surface, never by a stroke."
              series={BUCKETS}
              tableLabel="Show as table"
              title="Cost buckets by day"
              xLabel="Day"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Funnel — ordered, so the ordinal ramp">
        <Specimen label="tier progression">
          <div className="w-full min-w-96">
            <Funnel
              chartLabel="Show as chart"
              formatRate={(rate) => `${String(Math.round(rate * 100))}%`}
              stages={TIERS}
              tableLabel="Show as table"
              title="Tier progression"
              xLabel="Tier"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Heatmap — sequential, one hue, with a scale key">
        <Specimen label="covers by day × hour">
          <div className="w-full min-w-96">
            <Heatmap
              chartLabel="Show as chart"
              columns={HOURS.map((hour) => ({ key: hour, label: `${hour}:00` }))}
              rows={DAYS.map((day) => ({ key: day, label: day }))}
              scaleHighLabel="Busy"
              scaleLowLabel="Quiet"
              tableLabel="Show as table"
              title="Covers by hour"
              valueAt={(row, column) =>
                (DAYS.indexOf(row as (typeof DAYS)[number]) * 7 + Number(column)) % 40
              }
              xLabel="Day"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="RadarChart — capped at three, axes in canonical order">
        <Specimen label="two flavour profiles">
          <div className="w-full min-w-96">
            <RadarChart
              axes={FLAVOUR_AXES}
              chartLabel="Show as chart"
              description="An all-pairs form, so three slots is the measured ceiling."
              height={280}
              series={PROFILES}
              tableLabel="Show as table"
              title="Flavour profile"
              xLabel="Dimension"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="SmallMultiples — ten archetypes, never ten hues">
        <Specimen label="shared y-domain across every panel">
          <div className="w-full min-w-96">
            <SmallMultiples
              chartLabel="Show as chart"
              description="One shared scale, because panels on independent scales look comparable and are not."
              series={ARCHETYPES}
              tableLabel="Show as table"
              title="Covers by archetype"
              xLabel="Day"
            />
          </div>
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
