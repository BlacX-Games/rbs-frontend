import { Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { IconButton } from '@/components/primitives/IconButton';
import { Kbd } from '@/components/primitives/Kbd';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

/*
 * Specimen data stays UNEXPORTED. This file exports its component, which is
 * what keeps `react-refresh/only-export-components` quiet — a .tsx that
 * exports data while declaring a top-level component fails with
 * `localComponents`.
 */
const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;

export function ActionSpecimens() {
  return (
    <Section title="Actions">
      <SpecimenGroup title="Button — four variants, §5.5">
        {VARIANTS.map((variant) => (
          <Specimen key={variant} label={`variant="${variant}"`}>
            <Button variant={variant}>Publish version</Button>
          </Specimen>
        ))}
      </SpecimenGroup>

      <SpecimenGroup title="Button — states">
        <Specimen label="icon">
          <Button icon={<Check />} variant="primary">
            Approve
          </Button>
        </Specimen>
        <Specimen label="disabled">
          <Button disabled variant="primary">
            Publish version
          </Button>
        </Specimen>
        <Specimen label="loading + busyLabel">
          {/*
            The label stays put and the spinner takes the icon slot. Swapping
            the label for a spinner would resize a text container mid-action,
            which §5.6 forbids, and briefly leave the button unnamed.
          */}
          <Button busyLabel="Publishing the balancing version" loading variant="primary">
            Publish version
          </Button>
        </Specimen>
        <Specimen label="asChild → <a>">
          <Button asChild variant="secondary">
            <a href="#main">Open audit log</a>
          </Button>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="IconButton — label is required">
        <Specimen label='variant="ghost"'>
          <IconButton icon={<Trash2 />} label="Delete restaurant" />
        </Specimen>
        <Specimen label='variant="secondary"'>
          <IconButton icon={<Plus />} label="Add dish" variant="secondary" />
        </Specimen>
        <Specimen label="disabled">
          <IconButton disabled icon={<Trash2 />} label="Delete restaurant" variant="secondary" />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Kbd">
        <Specimen label="command palette hint">
          <span className="text-ink-secondary flex items-center gap-8 text-sm">
            Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search
          </span>
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
