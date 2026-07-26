import { CircleCheck, Minus, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { DensityToggle, ThemeToggle } from '@/design/ThemeControls';
import { env } from '@/lib/env';

/**
 * Stage 1 shell.
 *
 * The full `/design` gallery — every primitive, pattern, and chart in every
 * state — arrives in stage 4 behind the router. This page exists so stage 1 is
 * verifiable on its own: it proves the three faces load, that both themes and
 * both densities resolve, and that nothing here reaches for a hex literal.
 */

const SURFACES = [
  { token: '--bg-canvas', className: 'bg-canvas' },
  { token: '--bg-surface', className: 'bg-surface' },
  { token: '--bg-raised', className: 'bg-raised' },
  { token: '--bg-overlay', className: 'bg-overlay' },
] as const;

/** Fixed order, never cycled — see tokens.css. */
const SERIES = [
  'bg-series-1',
  'bg-series-2',
  'bg-series-3',
  'bg-series-4',
  'bg-series-5',
  'bg-series-6',
  'bg-series-7',
  'bg-series-8',
] as const;

const TIERS = [
  { label: 'New', className: 'bg-tier-new' },
  { label: 'Known', className: 'bg-tier-known' },
  { label: 'Popular', className: 'bg-tier-popular' },
  { label: 'Beloved', className: 'bg-tier-beloved' },
] as const;

/** Cost-% bands from `appendix/C_Wireframes.md`: green <32%, neutral 33–40%, red >40%. */
const POLARITY = [
  { label: 'Good', detail: 'under target', className: 'text-good', Icon: CircleCheck },
  { label: 'Neutral', detail: 'at target', className: 'text-neutral', Icon: Minus },
  { label: 'Bad', detail: 'over target', className: 'text-bad', Icon: TriangleAlert },
] as const;

const ROWS = [
  { name: 'The Ember Room', revenue: '1,840.00' },
  { name: 'Declan’s Smokehouse', revenue: '−2,310.00' },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-12">
      <h2 className="text-ink-tertiary text-xs font-medium tracking-[0.14em] uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function App() {
  return (
    <main className="bg-canvas min-h-dvh px-32 py-48">
      <div className="mx-auto flex max-w-4xl flex-col gap-48">
        <header className="flex flex-wrap items-end justify-between gap-24">
          <div className="flex flex-col gap-8">
            <p className="text-ink-tertiary text-xs font-medium tracking-[0.2em] uppercase">
              Declan&rsquo;s Restaurant &amp; Bar Simulator
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Operator Console</h1>
            <p className="text-ink-secondary max-w-md text-base">
              Phase 1, stage 1 &mdash; design tokens, theming, and the self-hosted faces. The
              component gallery arrives with the router.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            <ThemeToggle />
            <DensityToggle />
          </div>
        </header>

        <div className="border-rule border-t" />

        <Section title="Typography">
          <div className="flex flex-col gap-16">
            <p className="font-display text-4xl">Fraunces &mdash; hero figures</p>
            <p className="text-md">Inter &mdash; body, labels, tables, controls</p>
            <p className="font-mono text-base">JetBrains Mono &mdash; 0O1lI &middot; a3f9c2b7</p>
            <p className="tabular text-ink-secondary text-base">
              Tabular figures &amp; true minus: 1,840.00 &middot; &minus;320.00 &middot; 46.7%
            </p>
          </div>
        </Section>

        <Section title="Surfaces">
          <div className="flex flex-wrap gap-8">
            {SURFACES.map(({ token, className }) => (
              <div
                key={token}
                className={`border-rule flex flex-col gap-4 rounded-md border p-16 ${className}`}
              >
                <span className="font-mono text-xs">{token}</span>
                <span className="text-ink-secondary text-xs">The quick brown fox</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Gold — brand, accent, focus. Never status.">
          <div className="bg-surface border-rule flex flex-wrap items-center gap-16 rounded-md border p-16">
            <span className="bg-gold text-gold-ink rounded-sm px-12 py-8 text-base font-medium">
              Gold fill
            </span>
            <a className="text-gold-text text-base underline underline-offset-4" href="#main">
              Gold link at body size
            </a>
            <span className="font-display text-gold text-3xl">$1,840.00</span>
          </div>
        </Section>

        <Section title="Categorical series — 8 slots, fixed order">
          <div className="flex flex-wrap gap-4">
            {SERIES.map((className, index) => (
              <div key={className} className="flex flex-col items-center gap-4">
                <div className={`size-48 rounded-sm ${className}`} />
                <span className="text-ink-tertiary font-mono text-xs">{index + 1}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Polarity — the diverging scale that replaced amber">
          <div className="bg-surface border-rule flex flex-wrap gap-24 rounded-md border p-16">
            {POLARITY.map(({ label, detail, className, Icon }) => (
              <div key={label} className="flex items-center gap-8">
                {/*
                  Golden rule 9 in miniature: the polarity rides on the GLYPH,
                  and the label is ordinary ink. Colouring the label instead
                  would put --polarity-neutral (3.64:1 light / 3.40:1 dark) on
                  body-size text and fail WCAG — it clears the 3:1 bar for marks
                  and large text only.
                */}
                <Icon className={`size-16 ${className}`} aria-hidden={true} />
                <span className="text-base font-medium">{label}</span>
                <span className="text-ink-secondary text-sm">{detail}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Progression tiers — ordinal, one hue, monotone lightness">
          <div className="flex flex-wrap gap-4">
            {TIERS.map(({ label, className }) => (
              <div key={label} className="flex flex-col items-center gap-4">
                <div className={`h-48 w-96 rounded-sm ${className}`} />
                <span className="text-ink-tertiary text-xs">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Density">
          <table className="border-rule w-full border-collapse border-t text-left">
            <caption className="text-ink-tertiary pb-8 text-left text-xs">
              Row height follows <code className="text-xs">--row-h</code> &mdash; 44px comfortable,
              32px compact.
            </caption>
            <thead>
              <tr className="border-rule border-b">
                <th className="text-ink-tertiary px-(--cell-pad-x) py-(--cell-pad-y) text-xs font-medium">
                  Restaurant
                </th>
                <th className="text-ink-tertiary px-(--cell-pad-x) py-(--cell-pad-y) text-right text-xs font-medium">
                  Net profit
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ name, revenue }) => (
                <tr key={name} className="border-hairline h-(--row-h) border-b">
                  <td className="px-(--cell-pad-x) py-(--cell-pad-y) text-(length:--text-table)">
                    {name}
                  </td>
                  <td className="tabular px-(--cell-pad-x) py-(--cell-pad-y) text-right text-(length:--text-table)">
                    {revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <footer className="border-rule text-ink-tertiary flex flex-wrap gap-24 border-t pt-16 text-xs">
          <span>
            Build <span className="font-mono">{import.meta.env.MODE}</span>
          </span>
          <span>
            Data <span className="font-mono">{env.useMocks ? 'mock' : 'live'}</span>
          </span>
          <span>
            API <span className="font-mono">{env.apiBaseUrl || 'same-origin'}</span>
          </span>
        </footer>
      </div>
    </main>
  );
}
