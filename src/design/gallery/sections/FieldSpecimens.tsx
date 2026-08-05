import { Input } from '@/components/primitives/Input';
import { NumberInput } from '@/components/primitives/NumberInput';
import { Select } from '@/components/primitives/Select';
import { Textarea } from '@/components/primitives/Textarea';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

/**
 * Every field here is UNCONTROLLED — `defaultValue`, never `value`.
 *
 * React logs "changing an uncontrolled input to be controlled" as a
 * `console.error`, and `e2e/smoke.spec.ts` fails the whole suite on any console
 * error. A specimen that starts with `value={undefined}` and later receives one
 * would break an unrelated smoke test with a failure message pointing nowhere
 * near here. Controlled behaviour is covered in the unit suites instead.
 */

/** Prisma is canonical for the wire value; the label is what an operator reads. */
const PRICE_BRACKETS = [
  { value: 'budget', label: 'Budget' },
  { value: 'budget_mid', label: 'Budget–Mid' },
  { value: 'mid', label: 'Mid' },
  { value: 'premium', label: 'Premium' },
] as const;

export function FieldSpecimens() {
  return (
    <Section title="Fields">
      <SpecimenGroup title="Input">
        <Specimen label="label">
          <Input defaultValue="The Ember Room" label="Restaurant name" />
        </Specimen>
        <Specimen label="description">
          <Input
            defaultValue="The Ember Room"
            description="Shown to players on the restaurant card."
            label="Restaurant name"
          />
        </Specimen>
        <Specimen label="error">
          <Input
            defaultValue="Declan&rsquo;s Smokehouse"
            error="That name is already taken."
            label="Restaurant name"
          />
        </Specimen>
        <Specimen label="labelHidden">
          <Input label="Search sessions" labelHidden placeholder="Search sessions&hellip;" />
        </Specimen>
        <Specimen label="disabled">
          <Input defaultValue="The Ember Room" disabled label="Restaurant name" />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Textarea — grows with its content, never a fixed height">
        <Specimen label="rows=3">
          <Textarea
            defaultValue="Brisket was dry, but the service more than made up for it."
            description="Only the review text may be edited &mdash; scores are never writable."
            label="Review text"
          />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="NumberInput — steppers beside the field, each a full target">
        <Specimen label="min/max/step">
          <NumberInput
            decrementLabel="Decrease food cost target"
            defaultValue={32}
            formatValue={(value) => `${String(value)} percent`}
            incrementLabel="Increase food cost target"
            label="Food cost target"
            max={100}
            min={0}
          />
        </Specimen>
        <Specimen label="fractional step">
          <NumberInput
            decrementLabel="Decrease gain factor"
            defaultValue={0.15}
            incrementLabel="Increase gain factor"
            label="Reputation gain factor"
            max={1}
            min={0}
            step={0.01}
          />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Select">
        <Specimen label="placeholder">
          <Select items={PRICE_BRACKETS} label="Price bracket" placeholder="Choose a bracket" />
        </Specimen>
        <Specimen label="defaultValue">
          <Select
            defaultValue="budget_mid"
            items={PRICE_BRACKETS}
            label="Price bracket"
            placeholder="Choose a bracket"
          />
        </Specimen>
        <Specimen label="error">
          <Select
            error="Pick a bracket before saving."
            items={PRICE_BRACKETS}
            label="Price bracket"
            placeholder="Choose a bracket"
          />
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
