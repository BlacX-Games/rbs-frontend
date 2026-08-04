import { Checkbox } from '@/components/primitives/Checkbox';
import { Radio, RadioGroup } from '@/components/primitives/Radio';
import { Slider } from '@/components/primitives/Slider';
import { Switch } from '@/components/primitives/Switch';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

/** The four canon tiers — `balancing.json` is the machine-readable authority. */
const TIERS = [
  { value: 'new', label: 'New' },
  { value: 'known', label: 'Known' },
  { value: 'popular', label: 'Popular' },
  { value: 'beloved', label: 'Beloved' },
] as const;

export function ChoiceSpecimens() {
  return (
    <Section title="Choice">
      <SpecimenGroup title="Checkbox">
        <Specimen label="unchecked">
          <Checkbox label="Featured" />
        </Specimen>
        <Specimen label="defaultChecked">
          <Checkbox defaultChecked label="Featured" />
        </Specimen>
        <Specimen label='checked="indeterminate"'>
          {/*
            Announces as aria-checked="mixed". A bulk-selection header that
            reported itself as checked would claim every row is selected when
            only some are.
          */}
          <Checkbox checked="indeterminate" label="Select all reviews" />
        </Specimen>
        <Specimen label="description">
          <Checkbox
            defaultChecked
            description="Shown first in the moderation queue."
            label="Featured"
          />
        </Specimen>
        <Specimen label="disabled">
          <Checkbox disabled label="Featured" />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Radio — one tab stop, arrows move and select">
        <Specimen label="vertical">
          <RadioGroup defaultValue="popular" label="Progression tier">
            {TIERS.map(({ value, label }) => (
              <Radio key={value} label={label} value={value} />
            ))}
          </RadioGroup>
        </Specimen>
        <Specimen label='orientation="horizontal"'>
          <RadioGroup defaultValue="known" label="Tier filter" orientation="horizontal">
            {TIERS.map(({ value, label }) => (
              <Radio key={value} label={label} value={value} />
            ))}
          </RadioGroup>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Switch">
        <Specimen label="off">
          <Switch label="Poll for new sessions" />
        </Specimen>
        <Specimen label="defaultChecked + description">
          <Switch
            defaultChecked
            description="Refreshes every 15 seconds while the tab is visible."
            label="Poll for new sessions"
          />
        </Specimen>
        <Specimen label="disabled">
          <Switch disabled label="Poll for new sessions" />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Slider — the track row is the target, not the thumb">
        <Specimen label="single value">
          <div className="w-full min-w-96">
            <Slider
              defaultValue={[42]}
              formatValue={(value) => `${String(value)} covers`}
              label="Covers served"
              max={120}
              min={0}
            />
          </div>
        </Specimen>
        <Specimen label="range — each thumb named">
          <div className="w-full min-w-96">
            <Slider defaultValue={[20, 80]} label="Reputation band" max={100} min={0} />
          </div>
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
