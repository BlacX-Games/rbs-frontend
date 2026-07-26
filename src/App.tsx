import { env } from '@/lib/env';

/**
 * Placeholder shell.
 *
 * Phase 0 ships a blank app on purpose. The design tokens land in Phase 1 and
 * the real shell — left rail, top bar, breadcrumb, command palette — in Phase 2,
 * at which point this file becomes the router outlet. Everything here is inline
 * Tailwind against raw brand hexes so the build proves the *pipeline* without
 * pretending to make a visual decision.
 */
export function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0C0B0A] px-6 py-16 text-center">
      <p className="text-xs font-medium tracking-[0.2em] text-[#A8A29A] uppercase">
        Declan&rsquo;s Restaurant &amp; Bar Simulator
      </p>

      <h1 className="text-3xl font-semibold text-[#F2EDE3]">Operator Console</h1>

      <span className="h-px w-10 bg-[#D9B441]" aria-hidden="true" />

      <p className="max-w-md text-sm text-[#A8A29A]">
        Phase 0 &mdash; toolchain only. The design system arrives in Phase 1, the app shell and data
        layer in Phase 2.
      </p>

      <dl className="mt-2 flex gap-6 text-xs text-[#8A847B]">
        <div className="flex gap-2">
          <dt>Build</dt>
          <dd className="font-mono text-[#F2EDE3]">{import.meta.env.MODE}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Data</dt>
          <dd className="font-mono text-[#F2EDE3]">{env.useMocks ? 'mock' : 'live'}</dd>
        </div>
        <div className="flex gap-2">
          <dt>API</dt>
          <dd className="font-mono text-[#F2EDE3]">{env.apiBaseUrl || 'same-origin'}</dd>
        </div>
      </dl>
    </main>
  );
}
