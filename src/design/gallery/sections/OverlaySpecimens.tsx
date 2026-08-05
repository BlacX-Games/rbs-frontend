import { Ellipsis, Info, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Dialog, DialogClose } from '@/components/primitives/Dialog';
import { Drawer } from '@/components/primitives/Drawer';
import { DropdownCheckboxMenu, DropdownMenu } from '@/components/primitives/DropdownMenu';
import { IconButton } from '@/components/primitives/IconButton';
import { Popover } from '@/components/primitives/Popover';
import { Switch } from '@/components/primitives/Switch';
import { Tooltip } from '@/components/primitives/Tooltip';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

/**
 * Every overlay here is UNCONTROLLED — opened by its own trigger.
 *
 * The same reason the field specimens are: a specimen whose `open` starts
 * undefined and later receives a boolean makes React log a controlled/
 * uncontrolled warning, and `e2e/smoke.spec.ts` fails the suite on any console
 * error, pointing nowhere near this file.
 */

const ROW_ACTIONS = [
  { id: 'export', label: 'Export account', Icon: Upload, onSelect: () => undefined },
  {
    id: 'delete',
    label: 'Delete account',
    Icon: Trash2,
    onSelect: () => undefined,
    destructive: true,
    separatorBefore: true,
  },
] as const;

const COLUMNS = [
  { id: 'covers', label: 'Covers', checked: true, onCheckedChange: () => undefined },
  { id: 'revenue', label: 'Revenue', checked: true, onCheckedChange: () => undefined },
  { id: 'margin', label: 'Margin', checked: false, onCheckedChange: () => undefined },
] as const;

export function OverlaySpecimens() {
  return (
    <Section title="Overlays">
      <SpecimenGroup title="Dialog — Esc closes, focus returns to the trigger">
        <Specimen label="title + description + footer">
          <Dialog
            closeLabel="Close dialog"
            description="This removes the restaurant and every session under it."
            footer={
              <>
                <DialogClose>
                  <Button>Cancel</Button>
                </DialogClose>
                <DialogClose>
                  <Button variant="danger">Delete restaurant</Button>
                </DialogClose>
              </>
            }
            title="Delete The Ember Room?"
            // Not "Delete restaurant": three IconButtons earlier in the gallery
            // already carry that name, and the e2e matrix locates this trigger
            // by role and name. A duplicate name is also a real usability
            // defect — a screen-reader user listing buttons would hear it four
            // times with no way to tell them apart.
            trigger={<Button variant="danger">Open delete dialog</Button>}
          >
            <p className="text-ink-secondary text-base">
              Typed confirmation arrives with ConfirmDialog in stage 3 &mdash; golden rule 8
              requires it before anything destructive actually ships.
            </p>
          </Dialog>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Drawer — the §4 peek, a side-anchored Dialog">
        <Specimen label="right edge">
          <Drawer
            closeLabel="Close drawer"
            description="24 Jul 2026, 20:14"
            title="Service session"
            trigger={<Button>Open session peek</Button>}
          >
            <p className="text-ink-secondary text-base">
              Triage without losing the list&rsquo;s scroll or filters. The full detail route is the
              shareable counterpart, which is why the drawer owns no URL.
            </p>
          </Drawer>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Popover — non-modal, no scrim, no focus trap">
        <Specimen label="filter surface">
          <Popover
            label="Session filters"
            trigger={<Button icon={<SlidersHorizontal />}>Filters</Button>}
          >
            <div className="flex flex-col gap-12">
              <Switch label="Negative profit only" />
              <Switch label="Failed inspections" />
            </div>
          </Popover>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Tooltip — supplementary only, never a control's name">
        <Specimen label="on an IconButton">
          <Tooltip
            content="Food cost as a percentage of revenue. Target is 32%."
            trigger={<IconButton icon={<Info />} label="About food cost" />}
          />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="DropdownMenu">
        <Specimen label="row actions, one destructive">
          <DropdownMenu
            items={ROW_ACTIONS}
            label="Player row actions"
            trigger={<IconButton icon={<Ellipsis />} label="Player row actions" />}
          />
        </Specimen>
        <Specimen label="checkbox items — stays open">
          <DropdownCheckboxMenu
            items={COLUMNS}
            label="Visible columns"
            trigger={<Button>Columns</Button>}
          />
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
