import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AuditTrail } from '@/components/patterns/AuditTrail';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { DataTable } from '@/components/patterns/DataTable';
import { DetailDrawer } from '@/components/patterns/DetailDrawer';
import { FilterBar } from '@/components/patterns/FilterBar';
import { FlavorProfileEditor } from '@/components/patterns/FlavorProfileEditor';
import { JsonDiff } from '@/components/patterns/JsonDiff';
import { emptyFlavorProfile, type FlavorProfile } from '@/components/patterns/flavor';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

interface Session {
  readonly id: string;
  readonly restaurant: string;
  readonly covers: number;
  /** A decimal STRING, exactly as it crosses the wire. */
  readonly revenue: string;
  readonly margin: string;
}

const SESSIONS: readonly Session[] = [
  { id: 's1', restaurant: 'The Ember Room', covers: 42, revenue: '1,840.00', margin: '46.7%' },
  { id: 's2', restaurant: 'Declan’s Smokehouse', covers: 28, revenue: '990.50', margin: '31.2%' },
  { id: 's3', restaurant: 'Trattoria Vecchia', covers: 61, revenue: '2,260.00', margin: '52.1%' },
  { id: 's4', restaurant: 'Izakaya Nishi', covers: 35, revenue: '1,410.00', margin: '38.4%' },
];

const COLUMNS: readonly ColumnDef<Session, never>[] = [
  { id: 'restaurant', accessorKey: 'restaurant', header: 'Restaurant' },
  { id: 'covers', accessorKey: 'covers', header: 'Covers', meta: { numeric: true } },
  { id: 'revenue', accessorKey: 'revenue', header: 'Revenue', meta: { numeric: true } },
  { id: 'margin', accessorKey: 'margin', header: 'Margin', meta: { numeric: true } },
];

/** A slice of the real `balancing.json` shape, before and after a gainFactor edit. */
const BEFORE = {
  reputation: { gainFactor: 0.15, lossFactor: 0.2 },
  economy: { foodCostTarget: 32, beverageCostTarget: 22 },
  events: { vipGuest: null },
};

const AFTER = {
  reputation: { gainFactor: 0.18, lossFactor: 0.2 },
  economy: { foodCostTarget: 30, beverageCostTarget: 22, labourCostTarget: 35 },
  events: { vipGuest: { weight: 3 } },
};

const AUDIT = [
  {
    id: 'a1',
    actor: 'Shayan S.',
    action: 'balancing.publish',
    target: 'version 12',
    at: '4 Aug 2026, 09:14',
    atDateTime: '2026-08-04T09:14:00Z',
  },
  {
    id: 'a2',
    actor: 'Declan S.',
    action: 'review.moderate',
    target: 'review 018f2c…',
    at: '3 Aug 2026, 17:02',
    atDateTime: '2026-08-03T17:02:00Z',
  },
  {
    id: 'a3',
    actor: 'Shayan S.',
    action: 'player.delete',
    target: 'player 018e9a…',
    at: '2 Aug 2026, 11:48',
    atDateTime: '2026-08-02T11:48:00Z',
  },
] as const;

const BRACKETS = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid', label: 'Mid' },
  { value: 'premium', label: 'Premium' },
] as const;

export function DataSpecimens() {
  const [selected, setSelected] = useState<readonly string[]>(['s1']);
  const [profile, setProfile] = useState<FlavorProfile>(() => ({
    ...emptyFlavorProfile(),
    Salt: 72,
    Umami: 88,
    Smoke: 94,
    Fat: 76,
  }));

  return (
    <Section title="Data">
      <SpecimenGroup title="FilterBar — one row, scoping everything below it">
        <Specimen label="two filters + clear">
          <div className="w-full min-w-96">
            <FilterBar activeCount={2} label="Session filters" onClear={() => undefined}>
              <Input label="Search" labelHidden placeholder="Search sessions…" />
              <Select items={BRACKETS} label="Price bracket" placeholder="Any bracket" />
            </FilterBar>
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="DataTable — sortable, selectable, exportable, density-aware">
        <Specimen label="with row selection">
          <div className="w-full min-w-96">
            <DataTable
              caption="Service sessions"
              columns={COLUMNS}
              onSelectedChange={setSelected}
              rowId={(row) => row.id}
              rows={SESSIONS}
              selectAllLabel="Select all sessions"
              selectLabel={(row) => `Select ${row.restaurant}`}
              selectable
              selected={selected}
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="DetailDrawer — the §4 peek, over the proven Drawer">
        <Specimen label="fields + body">
          <DetailDrawer
            closeLabel="Close session peek"
            description="24 Jul 2026, 20:14"
            fields={[
              { label: 'Session id', value: '018f2c7a-4b11-7c9e-93aa-0f1b2c3d4e5f', mono: true },
              { label: 'Covers', value: '42' },
              { label: 'Revenue', value: '$1,840.00' },
              { label: 'Margin', value: '46.7%' },
            ]}
            title="The Ember Room"
            trigger={<Button>Open session peek</Button>}
          >
            <p className="text-ink-secondary text-sm">
              Triage without losing the list&rsquo;s scroll or filters. The full detail route is the
              shareable counterpart.
            </p>
          </DetailDrawer>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="ConfirmDialog — golden rule 8, typed literal">
        <Specimen label='confirmWord="DELETE"'>
          <ConfirmDialog
            actionLabel="Delete restaurant"
            cancelLabel="Cancel"
            confirmLabel="Type DELETE to confirm"
            confirmWord="DELETE"
            consequence={
              <p className="border-rule text-ink-secondary rounded-md border p-12 text-sm">
                3 service sessions and 7 reviews will be deleted. This cannot be undone.
              </p>
            }
            description="This removes the restaurant and everything recorded under it."
            onConfirm={() => undefined}
            title="Delete The Ember Room?"
            trigger={
              <Button icon={<Trash2 />} variant="danger">
                Open destructive confirm
              </Button>
            }
          />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="JsonDiff — path-based, so a reformat is not a change">
        <Specimen label="a balancing publish">
          <div className="w-full min-w-96">
            <JsonDiff
              after={AFTER}
              afterLabel="Version 12"
              before={BEFORE}
              beforeLabel="Version 11"
              caption="Balancing diff"
              showUnchangedLabel="Show unchanged"
              summaryLabel={({ added, removed, changed }) =>
                `${String(changed)} changed · ${String(added)} added · ${String(removed)} removed`
              }
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="AuditTrail — absolute timestamps, no PII">
        <Specimen label="reverse-chronological">
          <div className="w-full min-w-96">
            <AuditTrail caption="Recent admin actions" entries={AUDIT} />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="FlavorProfileEditor — radar paired with clamped inputs">
        <Specimen label="ten dimensions, canonical order">
          <div className="w-full min-w-96">
            <FlavorProfileEditor
              chartChartLabel="Show as chart"
              chartTableLabel="Show as table"
              label="Smoked Brisket Sandwich"
              onValueChange={setProfile}
              stepLabel={(dimension, direction) => `${direction} ${dimension}`}
              value={profile}
            />
          </div>
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
