import type { ReactNode } from 'react';

/**
 * Layout for the design gallery.
 *
 * Heading levels are load-bearing here, not stylistic. The page has exactly one
 * `<h1>` — "Operator Console" — and `e2e/smoke.spec.ts` asserts its typeface
 * through `page.locator('h1')`, a STRICT-MODE locator that throws the moment a
 * second `h1` exists. So sections are `h2` and specimen groups are `h3`, which
 * is also simply the correct document outline.
 */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-12">
      <h2 className="text-ink-tertiary text-xs font-medium tracking-[0.14em] uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function SpecimenGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-12">
      <h3 className="text-ink-secondary text-sm font-medium">{title}</h3>
      <div className="border-rule bg-surface flex flex-wrap items-start gap-24 rounded-md border p-16">
        {children}
      </div>
    </div>
  );
}

/**
 * One state of one component, captioned with the props that produced it.
 *
 * The caption is mono and tertiary so it reads as annotation rather than as UI
 * — a gallery whose labels look like content teaches the wrong visual language.
 */
export function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <span className="text-ink-tertiary font-mono text-xs">{label}</span>
      {children}
    </div>
  );
}
