import { Minus, PenLine, Plus } from 'lucide-react';
import { useState } from 'react';
import { countChanges, diffJson, type DiffEntry } from '@/components/patterns/internal/diff';
import { Switch } from '@/components/primitives/Switch';
import { cn } from '@/lib/cn';

export type JsonDiffProps = {
  readonly caption: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly beforeLabel: string;
  readonly afterLabel: string;
  /** Toggles rows that did not move. */
  readonly showUnchangedLabel: string;
  readonly summaryLabel: (counts: { added: number; removed: number; changed: number }) => string;
  readonly className?: string;
};

/**
 * Two panes with add / remove / change gutters, for the Balancing Studio.
 *
 * The gutter carries a GLYPH as well as a colour, per golden rule 9 — and here
 * that is not a formality: a reviewer scanning a publish diff for one moved
 * number is exactly the reader who cannot afford red and green to be the only
 * difference. Status tokens are used rather than categorical hues because
 * added/removed genuinely IS state, not identity.
 */
const GUTTER = {
  added: { Icon: Plus, ink: 'text-status-good', mark: '+' },
  removed: { Icon: Minus, ink: 'text-status-critical', mark: '−' },
  changed: { Icon: PenLine, ink: 'text-gold-text', mark: '~' },
  unchanged: { Icon: Minus, ink: 'text-ink-tertiary', mark: ' ' },
} as const;

function DiffRow({ entry }: { readonly entry: DiffEntry }) {
  const { Icon, ink, mark } = GUTTER[entry.kind];

  return (
    <tr className="border-hairline border-b align-baseline">
      <td className="px-4 py-4">
        <span className={cn('flex items-center gap-2', ink)}>
          <Icon aria-hidden={true} className="size-12 shrink-0" />
          {/* The mark is sr-only text rather than a second glyph, so the row's
              kind is spoken as well as drawn. */}
          <span className="sr-only">{entry.kind}</span>
          <span aria-hidden={true} className="font-mono text-xs">
            {mark}
          </span>
        </span>
      </td>

      <th
        className="text-ink-secondary px-8 py-4 text-left font-mono text-xs font-normal"
        scope="row"
      >
        {entry.path}
      </th>

      <td className="text-ink px-8 py-4 font-mono text-xs break-all">{entry.before ?? '—'}</td>
      <td className="text-ink px-8 py-4 font-mono text-xs break-all">{entry.after ?? '—'}</td>
    </tr>
  );
}

export function JsonDiff({
  caption,
  before,
  after,
  beforeLabel,
  afterLabel,
  showUnchangedLabel,
  summaryLabel,
  className,
}: JsonDiffProps) {
  const [showUnchanged, setShowUnchanged] = useState(false);

  const entries = diffJson(before as never, after as never);
  const counts = countChanges(entries);
  const shown = showUnchanged ? entries : entries.filter((entry) => entry.kind !== 'unchanged');

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className="flex flex-wrap items-center justify-between gap-12">
        {/* A live region: toggling unchanged rows changes what the table shows
            without moving focus, so the count has to be announced. */}
        <p aria-live="polite" className="text-ink-secondary text-sm">
          {summaryLabel(counts)}
        </p>
        <Switch
          checked={showUnchanged}
          label={showUnchangedLabel}
          onCheckedChange={setShowUnchanged}
        />
      </div>

      <div
        aria-label={caption}
        className="border-rule focus-visible:focus-ring max-h-96 overflow-auto rounded-md border"
        role="region"
        tabIndex={0}
      >
        <table className="w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface sticky top-0">
            <tr className="border-rule border-b">
              <th className="sr-only" scope="col">
                Change
              </th>
              <th className="text-ink-tertiary px-8 py-8 text-left text-xs font-medium" scope="col">
                Path
              </th>
              <th className="text-ink-tertiary px-8 py-8 text-left text-xs font-medium" scope="col">
                {beforeLabel}
              </th>
              <th className="text-ink-tertiary px-8 py-8 text-left text-xs font-medium" scope="col">
                {afterLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((entry) => (
              <DiffRow entry={entry} key={entry.path} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
