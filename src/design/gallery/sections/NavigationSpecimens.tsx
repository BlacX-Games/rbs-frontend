import { CircleCheck, TriangleAlert } from 'lucide-react';
import { Breadcrumb } from '@/components/primitives/Breadcrumb';
import { Button } from '@/components/primitives/Button';
import { Kbd } from '@/components/primitives/Kbd';
import { Pagination } from '@/components/primitives/Pagination';
import { Tabs } from '@/components/primitives/Tabs';
import { useToast } from '@/components/primitives/internal/toast-context';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

const CRUMBS = [
  { label: 'Live Ops', href: '#main' },
  { label: 'Restaurants', href: '#main' },
  { label: 'The Ember Room' },
] as const;

const TABS = [
  {
    value: 'overview',
    label: 'Overview',
    content: (
      <p className="text-ink-secondary text-base">Reputation, hygiene, and today&rsquo;s covers.</p>
    ),
  },
  {
    value: 'menu',
    label: 'Menu',
    content: (
      <p className="text-ink-secondary text-base">
        Dishes and drinks with DQS, CQS, and food-cost %.
      </p>
    ),
  },
  {
    value: 'staff',
    label: 'Staff',
    content: (
      <p className="text-ink-secondary text-base">Role, morale tier, weekly cost, tenure.</p>
    ),
  },
] as const;

/**
 * Toast is imperative, so the specimen is a button that raises one. A component
 * rather than inline JSX because it needs `useToast`, which only works below
 * the provider App.tsx mounts.
 */
function ToastSpecimens() {
  const { toast } = useToast();

  return (
    <SpecimenGroup title="Toast — tone rides the glyph, as everywhere else">
      <Specimen label="neutral">
        <Button
          onClick={() => {
            toast({ title: 'Draft saved', description: 'Balancing draft 13 stored locally.' });
          }}
        >
          Raise neutral
        </Button>
      </Specimen>
      <Specimen label='tone="good" + action'>
        <Button
          onClick={() => {
            toast({
              title: 'Balancing version published',
              description: 'Version 12 is now active.',
              tone: 'good',
              icon: <CircleCheck />,
              action: { label: 'View version', onClick: () => undefined },
            });
          }}
        >
          Raise good
        </Button>
      </Specimen>
      <Specimen label='tone="bad"'>
        <Button
          onClick={() => {
            toast({
              title: 'Publish failed',
              description: 'The golden-value diff reports a breaking change.',
              tone: 'bad',
              icon: <TriangleAlert />,
            });
          }}
        >
          Raise bad
        </Button>
      </Specimen>
    </SpecimenGroup>
  );
}

export function NavigationSpecimens() {
  return (
    <Section title="Navigation">
      <SpecimenGroup title="Breadcrumb — the last crumb is aria-current, not a link">
        <Specimen label="three levels">
          <Breadcrumb items={CRUMBS} label="Breadcrumb" />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Tabs — a hairline rule, not pills (§5.1 principle 3)">
        <Specimen label="three panels">
          <div className="w-full min-w-96">
            <Tabs defaultValue="overview" items={TABS} label="Restaurant sections" />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Pagination — cursor-based, so no numbered pages">
        <Specimen label="mid-list">
          <div className="w-full min-w-96">
            <Pagination
              hasNext
              hasPrevious
              label="Session pages"
              nextLabel="Next"
              onNext={() => undefined}
              onPrevious={() => undefined}
              previousLabel="Previous"
              rangeLabel="51&ndash;100 of 1,204"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <ToastSpecimens />

      <SpecimenGroup title="Kbd — the ⌘K hint the palette will use in stage 2b-ii">
        <Specimen label="chord">
          <span className="text-ink-secondary flex items-center gap-8 text-sm">
            <Kbd>⌘</Kbd> <Kbd>K</Kbd> opens the command palette
          </span>
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
