import { createFileRoute } from '@tanstack/react-router';
import { DesignGallery } from '@/design/gallery/DesignGallery';
import { DensityToggle, ThemeToggle } from '@/design/ThemeControls';
import { t } from '@/i18n/t';
import { env } from '@/lib/env';

/**
 * The living token and component gallery (§4), inherited from Phase 1.
 *
 * ── Outside the auth wall, deliberately ────────────────────────────────────
 * §4 marks it "dev + preview only". It renders specimens and reads no data, so
 * there is nothing here to protect — and putting it behind sign-in would mean
 * `design.visual.spec.ts` has to authenticate before photographing a button,
 * and `design.matrix.spec.ts` before measuring one. Thirty-four snapshots and a
 * theme × density matrix would each carry a login they do not test.
 *
 * ── It is also outside the shell ───────────────────────────────────────────
 * No rail, no top bar. The gallery is ~20,000px of specimens; framing it in the
 * chrome would put the console's own components inside the screenshots of those
 * same components, and every rail change would re-baseline all 34 images.
 */
export const Route = createFileRoute('/design')({
  component: DesignRoute,
});

function DesignRoute() {
  return (
    <main className="bg-canvas min-h-dvh px-32 py-48" id="main">
      <div className="mx-auto flex max-w-4xl flex-col gap-48">
        <header className="flex flex-wrap items-end justify-between gap-24">
          <div className="flex flex-col gap-8">
            <p className="text-ink-tertiary text-xs font-medium tracking-[0.2em] uppercase">
              {t('app.product')}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {t('route.design')}
            </h1>
          </div>

          <div className="flex flex-col gap-8">
            <ThemeToggle />
            <DensityToggle />
          </div>
        </header>

        <div className="border-rule border-t" />

        <DesignGallery />

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
