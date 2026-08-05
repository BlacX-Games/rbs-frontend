import { LineChart } from '@/components/charts/LineChart';
import type { ChartPoint } from '@/components/charts/chart';
import { DecisionFlag } from '@/components/patterns/DecisionFlag';
import { HealthMeter } from '@/components/patterns/HealthMeter';
import { MetricCard } from '@/components/patterns/MetricCard';
import { ScoreDial } from '@/components/patterns/ScoreDial';
import { StatTile } from '@/components/patterns/StatTile';
import { EmptyState, ErrorState, ForbiddenState } from '@/components/patterns/states';
import { Button } from '@/components/primitives/Button';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const TREND: readonly ChartPoint[] = [980, 1240, 860, 1380, 1840, 2260, 1610].map((y, index) => ({
  x: DAYS[index] ?? String(index),
  y,
}));

/** The three cost buckets from §6.1's session detail, with their §5.2 bands. */
const BUCKETS = [
  { label: 'Food', value: 26.1, target: 32, band: 'good', bandLabel: 'under target' },
  { label: 'Beverage', value: 19.0, target: 22, band: 'good', bandLabel: 'under target' },
  { label: 'Labour', value: 36.4, target: 35, band: 'neutral', bandLabel: 'at target' },
  { label: 'Overheads', value: 44.2, target: 35, band: 'bad', bandLabel: 'over target' },
] as const;

export function ReadoutSpecimens() {
  return (
    <Section title="Readouts">
      <SpecimenGroup title="StatTile — hero figure in Fraunces, value as a string">
        <Specimen label="value only">
          <StatTile label="Covers" value="42" />
        </Specimen>
        <Specimen label="delta, up is good">
          <StatTile
            delta={{ value: '+12.4%', direction: 'up', label: 'vs previous 7 days' }}
            label="Revenue"
            value="$1,840.00"
          />
        </Specimen>
        <Specimen label="delta, up is BAD">
          <StatTile
            delta={{ value: '+3.1pp', direction: 'up', label: 'vs previous 7 days' }}
            label="Food cost"
            upIsGood={false}
            value="31.2%"
          />
        </Specimen>
        <Specimen label="flat — ordinary ink, never the midpoint">
          <StatTile
            delta={{ value: '0.0%', direction: 'flat', label: 'vs previous 7 days' }}
            label="Satisfaction"
            value="74 / 100"
          />
        </Specimen>
        <Specimen label="with a sparkline">
          <StatTile
            delta={{ value: '+64%', direction: 'up', label: 'vs previous 7 days' }}
            label="Revenue"
            trend={{ points: TREND, summary: 'up 64% over seven services' }}
            value="$1,840.00"
          />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="MetricCard — no per-card time range; FilterBar owns the window">
        <Specimen label="tile + chart">
          <div className="w-full min-w-96">
            <MetricCard
              chart={
                <LineChart
                  chartLabel="Show as chart"
                  series={[{ key: 'revenue', label: 'Revenue', slot: 2, points: TREND }]}
                  tableLabel="Show as table"
                  title="Revenue this week"
                  xLabel="Day"
                />
              }
              delta={{ value: '+64%', direction: 'up', label: 'vs previous 7 days' }}
              label="Revenue"
              value="$1,840.00"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="HealthMeter — the diverging scale that replaced amber">
        <Specimen label="the cost buckets, with targets">
          <div className="flex w-full min-w-96 flex-col gap-16">
            {BUCKETS.map((bucket) => (
              <HealthMeter
                band={bucket.band}
                bandLabel={bucket.bandLabel}
                key={bucket.label}
                label={bucket.label}
                target={bucket.target}
                targetLabel={`target ${String(bucket.target)}%`}
                value={bucket.value}
                valueLabel={`${bucket.value.toFixed(1)}%`}
              />
            ))}
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="ScoreDial — ordinal ramp, tier name always in ink">
        <Specimen label="each of the four tiers">
          <div className="flex flex-wrap gap-24">
            {[12, 45, 72, 91].map((value) => (
              <ScoreDial key={value} label="Reputation" value={value} />
            ))}
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="DecisionFlag — golden rule 5, never presented as settled">
        <Specimen label="inline beside a value">
          <span className="flex items-center gap-8 text-base">
            Price level <span className="font-mono">$$</span>
            <DecisionFlag
              detail="appendix/E_Open_Questions.md #20 — Restaurant.priceLevel duplicates Concept.priceBracket; the recommendation is to derive it and drop the field."
              href="#main"
              label="Restaurant.priceLevel"
            />
          </span>
        </Specimen>
        <Specimen label="no link">
          <span className="flex items-center gap-8 text-base">
            Guest energy
            <DecisionFlag
              detail="Open question #9 — guestEnergy is ambiguous between an ambience input and a simulation output."
              label="Ambience.guestEnergy"
            />
          </span>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="States — each names the next action">
        <Specimen label="empty">
          <div className="w-full min-w-96">
            <EmptyState
              action={<Button>Clear filters</Button>}
              description="No session matches this filter. Widen the date range or clear the archetype filter."
              title="No sessions"
            />
          </div>
        </Specimen>
        <Specimen label="error">
          <div className="w-full min-w-96">
            <ErrorState
              action={<Button variant="primary">Retry</Button>}
              description="The request timed out after 30 seconds. The backend may still be starting."
              title="Could not load sessions"
            />
          </div>
        </Specimen>
        <Specimen label="forbidden">
          <div className="w-full min-w-96">
            <ForbiddenState
              description="Balancing publish is owner and admin only. Ask an owner to grant the role."
              title="Not available to your role"
            />
          </div>
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
