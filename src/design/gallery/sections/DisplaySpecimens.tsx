import { CircleCheck, CircleMinus, Sparkles, TriangleAlert, XCircle } from 'lucide-react';
import { Avatar } from '@/components/primitives/Avatar';
import { Badge } from '@/components/primitives/Badge';
import { Progress } from '@/components/primitives/Progress';
import { Separator } from '@/components/primitives/Separator';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Tag } from '@/components/primitives/Tag';
import { Section, Specimen, SpecimenGroup } from '@/design/gallery/Specimen';

/**
 * Golden rule 9 made visible: every toned chip pairs its colour with a glyph,
 * and the LABEL stays in ink at every tone. Measured on --bg-raised, `critical`
 * is 3.66:1 on dark and `gold` 3.51:1 on paper — fine for a glyph, below the
 * 4.5:1 text gate. Tinting the label would ship an unreadable badge.
 */
const TONES = [
  { tone: 'neutral', label: 'Draft', Icon: CircleMinus },
  { tone: 'good', label: 'Under target', Icon: CircleCheck },
  { tone: 'bad', label: 'Over target', Icon: TriangleAlert },
  { tone: 'critical', label: 'Failed inspection', Icon: XCircle },
  { tone: 'gold', label: 'Signature', Icon: Sparkles },
] as const;

export function DisplaySpecimens() {
  return (
    <Section title="Display">
      <SpecimenGroup title="Badge — tone rides the glyph, never the label">
        {TONES.map(({ tone, label, Icon }) => (
          <Specimen key={tone} label={`tone="${tone}"`}>
            <Badge icon={<Icon />} tone={tone}>
              {label}
            </Badge>
          </Specimen>
        ))}
      </SpecimenGroup>

      <SpecimenGroup title="Tag">
        <Specimen label="plain">
          <Tag>Smoked</Tag>
        </Specimen>
        <Specimen label="tone + icon">
          <Tag icon={<Sparkles />} tone="gold">
            Signature cocktail
          </Tag>
        </Specimen>
        <Specimen label="onRemove — takes the control height">
          {/*
            A tag with a remove button IS a control, so it grows to --control-h
            and the button is a full 44×44 target in comfortable density.
            Shrinking it is how a 20px close affordance ships.
          */}
          <Tag onRemove={() => undefined} removeLabel="Remove the Smoked tag">
            Smoked
          </Tag>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Avatar — literal pixel sizes">
        {/*
          Initials only. An `src` here would either 404 or need an inline data
          URI carrying a colour literal, and e2e asserts both zero console
          errors and zero third-party requests. The image path is covered in
          the unit suite instead.
        */}
        <Specimen label="size={24}">
          <Avatar name="Danny R." size={24} />
        </Specimen>
        <Specimen label="size={32} — default">
          <Avatar name="Sasha M." />
        </Specimen>
        <Specimen label="size={44} — the row height">
          <Avatar name="Lena K." size={44} />
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Progress">
        <Specimen label="value={40}">
          <div className="w-96">
            <Progress label="Catalog export" value={40} />
          </div>
        </Specimen>
        <Specimen label="thickness={4}">
          <div className="w-96">
            <Progress label="Catalog export" thickness={4} value={72} />
          </div>
        </Specimen>
        <Specimen label="value={null} — indeterminate">
          <div className="w-96">
            <Progress label="Recomputing balancing hash" value={null} />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Skeleton — aria-hidden; aria-busy belongs on the container">
        <Specimen label="single">
          <div className="w-96">
            <Skeleton />
          </div>
        </Specimen>
        <Specimen label="lines={3}">
          <div className="w-96">
            <Skeleton lines={3} />
          </div>
        </Specimen>
      </SpecimenGroup>

      <SpecimenGroup title="Separator">
        <Specimen label="horizontal, decorative">
          <div className="w-96">
            <Separator />
          </div>
        </Specimen>
        <Specimen label="vertical, decorative={false}">
          <div className="flex h-24 items-center gap-16">
            <span className="text-ink-secondary text-sm">Live Ops</span>
            <Separator decorative={false} orientation="vertical" />
            <span className="text-ink-secondary text-sm">Catalog</span>
          </div>
        </Specimen>
      </SpecimenGroup>
    </Section>
  );
}
