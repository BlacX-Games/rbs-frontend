import { CalendarDays, Command as CommandIcon, Sparkles, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { CommandPalette } from '@/components/primitives/CommandPalette';
import { Combobox } from '@/components/primitives/Combobox';
import { DateRangePicker } from '@/components/primitives/DateRangePicker';
import { Kbd } from '@/components/primitives/Kbd';
import { MultiSelect } from '@/components/primitives/MultiSelect';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

/** The ten-concept catalogue from `08_Content_Data.md` §8.1, abbreviated. */
const CONCEPTS = [
  { value: 'smokehouse', label: 'Smokehouse', keywords: 'bbq brisket barbecue' },
  { value: 'bistro', label: 'Crème Brûlée Bistro', keywords: 'french' },
  { value: 'trattoria', label: 'Trattoria', keywords: 'italian pasta' },
  { value: 'izakaya', label: 'Izakaya', keywords: 'japanese small plates' },
  { value: 'taqueria', label: 'Taquería', keywords: 'mexican jalapeno' },
] as const;

const COMMANDS = [
  { id: 'players', label: 'Go to Players', group: 'Navigate', onSelect: () => undefined },
  { id: 'sessions', label: 'Go to Sessions', group: 'Navigate', onSelect: () => undefined },
  { id: 'reviews', label: 'Go to Reviews', group: 'Navigate', onSelect: () => undefined },
  {
    id: 'publish',
    label: 'Publish balancing version',
    group: 'Balancing',
    Icon: Upload,
    keywords: 'deploy release',
    onSelect: () => undefined,
  },
  {
    id: 'simulate',
    label: 'Simulate golden values',
    group: 'Balancing',
    Icon: Sparkles,
    onSelect: () => undefined,
  },
] as const;

export function SearchSpecimens() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    // The palette's trigger IS the shortcut — §4 puts ⌘K in the top bar, and
    // Phase 2 moves this binding to the shell. `metaKey || ctrlKey` so it works
    // on both platforms without sniffing the user agent.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <Section title="Search & dates">
      <SpecimenGroup title="Combobox — focus never leaves the input">
        <Specimen label="filterable, diacritic-insensitive">
          <div className="w-full min-w-96">
            <Combobox
              description="Type “creme” to find “Crème Brûlée Bistro”."
              emptyLabel="No concept matches"
              items={CONCEPTS}
              label="Concept"
              placeholder="Search concepts"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="MultiSelect — stays open, selections become tags">
        <Specimen label="defaultValue">
          <div className="w-full min-w-96">
            <MultiSelect
              defaultValue={['smokehouse', 'izakaya']}
              emptyLabel="No concept matches"
              items={CONCEPTS}
              label="Concept tags"
              placeholder="Add a concept"
              removeLabel={(item) => `Remove ${item}`}
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="DateRangePicker — an ARIA grid, hand-built on Intl">
        <Specimen label="two clicks, arrows to navigate">
          <div className="w-full min-w-96">
            <DateRangePicker
              description="Arrows move a day, ↑↓ a week, PageUp/Down a month, Shift+PageUp a year."
              label="Session dates"
              nextMonthLabel="Next month"
              placeholder="Any date"
              previousMonthLabel="Previous month"
            />
          </div>
        </Specimen>
        <Specimen label="min / max">
          <div className="w-full min-w-96">
            <DateRangePicker
              label="Balancing window"
              max="2026-12-31"
              min="2026-01-01"
              nextMonthLabel="Next month"
              placeholder="Any date in 2026"
              previousMonthLabel="Previous month"
            />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="CommandPalette — controlled, because ⌘K is the trigger">
        <Specimen label="open with the shortcut or the button">
          <div className="flex flex-wrap items-center gap-16">
            <Button
              icon={<CommandIcon />}
              onClick={() => {
                setPaletteOpen(true);
              }}
            >
              Open command palette
            </Button>
            <span className="text-ink-secondary flex items-center gap-8 text-sm">
              or <Kbd>⌘</Kbd> <Kbd>K</Kbd>
            </span>
          </div>
        </Specimen>
      </SpecimenGroup>

      <CommandPalette
        commands={COMMANDS}
        emptyLabel="No command matches"
        label="Command palette"
        onOpenChange={setPaletteOpen}
        open={paletteOpen}
        placeholder="Search commands and destinations"
      />

      <p className="text-ink-tertiary flex items-center gap-8 text-xs">
        <CalendarDays aria-hidden={true} className="size-16" />
        Dates cross the wire as <code className="text-xs">YYYY-MM-DD</code>, never as a{' '}
        <code className="text-xs">Date</code> &mdash; see the note in{' '}
        <code className="text-xs">internal/calendar.ts</code>.
      </p>
    </Section>
  );
}
